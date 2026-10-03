"""Read a LayerZero V2 OApp's security posture straight from the chain.

For every remote chain the OApp has a peer on, we read the effective receive and send ULN configs
(which DVNs must attest, how many confirmations), whether each is an explicit or default config,
and who controls the OApp (owner) and its endpoint configuration (delegate).
"""
import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from eth_abi import decode

from app.chains.evm import ZERO_ADDRESS, Call, CallFailed, EvmClient
from app.schemas.posture import AdminAccount, Pathway, UlnSide, Verifier

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
ULN_CONFIG = "(uint64,uint8,uint8,uint8,address[],address[])"
ULN_CONFIG_TYPE = 2
NIL_DVN_COUNT = 255  # ULN sentinel: "explicitly zero" required/optional DVNs

CHAINS = {
	"ethereum": {"eid": 30101, "endpoint": "0x1a44076050125825900e736c501f859c50fE728c"},
}


class NotAnOApp(ValueError):
	"""The address is not a LayerZero V2 OApp on this chain."""


@lru_cache(maxsize=1)
def eid_names() -> dict[int, str]:
	raw = json.load(open(DATA_DIR / "layerzero_eids.json"))
	return {int(eid): meta["name"] for eid, meta in raw.items()}


@lru_cache(maxsize=1)
def dvn_registry() -> dict[str, dict]:
	return json.load(open(DATA_DIR / "layerzero_dvns_ethereum.json"))


def _verifiers(addresses: list[str]) -> list[Verifier]:
	registry = dvn_registry()
	return [Verifier(address=a.lower(), name=(registry.get(a.lower()) or {}).get("name")) for a in addresses]


def _uln_side(raw_config, app_config, library: str, is_default_library: bool) -> UlnSide | None:
	if isinstance(raw_config, CallFailed):
		return None
	try:
		(cfg,) = decode([ULN_CONFIG], raw_config)
	except Exception:  # noqa: BLE001 - not a ULN library (e.g. a blocked/simple message lib)
		return None
	confirmations, required_count, _optional_count, threshold, required, optional = cfg
	required_effective = 0 if required_count == NIL_DVN_COUNT else len(required)
	# An app config that is entirely zero means every field falls through to LayerZero's default.
	uses_default = not isinstance(app_config, CallFailed) and app_config[0] == 0 and app_config[1] == 0 and app_config[2] == 0 and app_config[3] == 0
	return UlnSide(
		library=library.lower(),
		is_default_library=is_default_library or uses_default,
		confirmations=confirmations,
		required_dvns=_verifiers(list(required)),
		optional_dvns=_verifiers(list(optional)),
		optional_threshold=threshold,
		effective_verifiers=required_effective + threshold,
	)


async def classify_account(client: EvmClient, address: str) -> AdminAccount:
	address = address.lower()
	if address == ZERO_ADDRESS:
		return AdminAccount(address=address, type="none")
	code = await client.get_code(address)
	if code in (None, "0x", "0x0"):
		return AdminAccount(address=address, type="eoa")
	threshold, owners = await client.call_many(
		[
			Call(address, "getThreshold()", returns=("uint256",)),
			Call(address, "getOwners()", returns=("address[]",)),
		]
	)
	if not isinstance(threshold, CallFailed) and not isinstance(owners, CallFailed):
		return AdminAccount(address=address, type="safe", threshold=int(threshold), owners=len(owners))
	return AdminAccount(address=address, type="contract")


async def read_posture(client: EvmClient, oapp: str, chain: str = "ethereum") -> dict:
	"""Return raw posture parts: admin accounts and per-route ULN configs. Raises NotAnOApp."""
	spec = CHAINS[chain]
	endpoint = spec["endpoint"]
	oapp = oapp.lower()

	code = await client.get_code(oapp)
	if code in (None, "0x", "0x0"):
		raise NotAnOApp("No contract at this address.")
	endpoint_ref, owner, delegate = await client.call_many(
		[
			Call(oapp, "endpoint()", returns=("address",)),
			Call(oapp, "owner()", returns=("address",)),
			Call(endpoint, "delegates(address)", ("address",), (oapp,), ("address",)),
		]
	)
	if isinstance(endpoint_ref, CallFailed) or endpoint_ref.lower() != endpoint.lower():
		raise NotAnOApp("This contract is not a LayerZero V2 OApp on Ethereum (no endpoint() pointing at EndpointV2).")

	remote_eids = [eid for eid in eid_names() if eid != spec["eid"]]
	peers = await client.call_many([Call(oapp, "peers(uint32)", ("uint32",), (eid,), ("bytes32",)) for eid in remote_eids])
	active = [(eid, "0x" + peer.hex()) for eid, peer in zip(remote_eids, peers) if not isinstance(peer, CallFailed) and any(peer)]

	lib_calls: list[Call] = []
	for eid, _ in active:
		lib_calls += [
			Call(endpoint, "getReceiveLibrary(address,uint32)", ("address", "uint32"), (oapp, eid), ("address", "bool")),
			Call(endpoint, "getSendLibrary(address,uint32)", ("address", "uint32"), (oapp, eid), ("address",)),
			Call(endpoint, "isDefaultSendLibrary(address,uint32)", ("address", "uint32"), (oapp, eid), ("bool",)),
		]
	libs = await client.call_many(lib_calls)

	config_calls: list[Call] = []
	route_libs = []
	for i, (eid, _) in enumerate(active):
		receive, send, send_default = libs[3 * i : 3 * i + 3]
		receive_lib, receive_default = (receive if not isinstance(receive, CallFailed) else (ZERO_ADDRESS, False))
		send_lib = send if not isinstance(send, CallFailed) else ZERO_ADDRESS
		route_libs.append((receive_lib, bool(receive_default), send_lib, bool(send_default) if not isinstance(send_default, CallFailed) else False))
		for lib in (receive_lib, send_lib):
			config_calls += [
				Call(endpoint, "getConfig(address,address,uint32,uint32)", ("address", "address", "uint32", "uint32"), (oapp, lib, eid, ULN_CONFIG_TYPE), ("bytes",)),
				Call(lib, "getAppUlnConfig(address,uint32)", ("address", "uint32"), (oapp, eid), (ULN_CONFIG,)),
			]
	# LayerZero's default receive config per route (an OApp with no custom config sees exactly this).
	config_calls += [
		Call(receive_lib, "getUlnConfig(address,uint32)", ("address", "uint32"), (ZERO_ADDRESS, eid), (ULN_CONFIG,))
		for (eid, _), (receive_lib, *_rest) in zip(active, route_libs)
	]
	configs = await client.call_many(config_calls)
	defaults = configs[4 * len(active) :]
	default_confirmations = {
		eid: int(cfg[0]) for (eid, _), cfg in zip(active, defaults) if not isinstance(cfg, CallFailed)
	}

	pathways: list[Pathway] = []
	names = eid_names()
	for i, (eid, peer) in enumerate(active):
		receive_lib, receive_default, send_lib, send_default = route_libs[i]
		receive_raw, receive_app, send_raw, send_app = configs[4 * i : 4 * i + 4]
		pathways.append(
			Pathway(
				eid=eid,
				chain_name=names.get(eid),
				peer=peer,
				receive=_uln_side(receive_raw, receive_app, receive_lib, receive_default),
				send=_uln_side(send_raw, send_app, send_lib, send_default),
			)
		)

	owner_account = None if isinstance(owner, CallFailed) else await classify_account(client, owner)
	delegate_account = None if isinstance(delegate, CallFailed) else await classify_account(client, delegate)
	return {
		"chain": chain,
		"contract": oapp,
		"owner": owner_account,
		"delegate": delegate_account,
		"pathways": pathways,
		"default_confirmations": default_confirmations,
		"checked_at": datetime.now(timezone.utc),
	}
