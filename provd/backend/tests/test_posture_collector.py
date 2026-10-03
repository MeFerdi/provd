import asyncio

import pytest
from eth_abi import encode

from app.chains.evm import ZERO_ADDRESS, Call, CallFailed, EvmClient
from app.posture.layerzero import CHAINS, NIL_DVN_COUNT, NotAnOApp, ULN_CONFIG, read_posture
from app.posture.rules import evaluate

ENDPOINT = CHAINS["ethereum"]["endpoint"].lower()
OAPP = "0x" + "0a" * 20
SAFE = "0x" + "5a" * 20
DELEGATE_EOA = "0x" + "e0" * 20
RECV_LIB = "0x" + "c0" * 20
SEND_LIB = "0x" + "b0" * 20
LZ = "0x589dedbd617e0cbcb916a9223f4d1300c294236b"
NM = "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5"


def uln(confirmations, required, optional=(), threshold=0, required_count=None):
	count = len(required) if required_count is None else required_count
	return (confirmations, count, len(optional), threshold, list(required), list(optional))


class FakeChain(EvmClient):
	"""Answers the view calls read_posture makes, for an OApp with three peers."""

	def __init__(self, receive_configs, app_configs=None, endpoint_ref=ENDPOINT):
		super().__init__(["http://unused"])
		self.receive_configs = receive_configs
		self.app_configs = app_configs or {}
		self.endpoint_ref = endpoint_ref

	async def get_code(self, address):
		return "0x" if address.lower() == DELEGATE_EOA else "0x6080"

	def _answer(self, call: Call):
		sig, to, args = call.signature, call.to.lower(), call.args
		if sig == "endpoint()":
			return self.endpoint_ref
		if sig == "owner()":
			return SAFE
		if sig == "delegates(address)":
			return DELEGATE_EOA
		if sig == "getThreshold()":
			return 3 if to == SAFE else CallFailed("revert")
		if sig == "getOwners()":
			return [SAFE] * 5 if to == SAFE else CallFailed("revert")
		if sig == "peers(uint32)":
			return bytes.fromhex("11" * 32) if args[0] in self.receive_configs else bytes(32)
		if sig == "getReceiveLibrary(address,uint32)":
			return (RECV_LIB, False)
		if sig == "getSendLibrary(address,uint32)":
			return SEND_LIB
		if sig == "isDefaultSendLibrary(address,uint32)":
			return False
		if sig == "getConfig(address,address,uint32,uint32)":
			cfg = self.receive_configs[args[2]] if args[1] == RECV_LIB else uln(15, [LZ, NM])
			return encode([ULN_CONFIG], [cfg])
		if sig == "getAppUlnConfig(address,uint32)":
			return self.app_configs.get(args[1], uln(64, [LZ, NM]))
		if sig == "getUlnConfig(address,uint32)":
			assert args[0] == ZERO_ADDRESS
			return uln(15, [LZ, NM])
		raise AssertionError(f"unexpected call {sig}")

	async def call_many(self, calls, block="latest"):
		return [self._answer(c) for c in calls]


def test_reads_routes_verifiers_and_admin():
	chain = FakeChain(
		receive_configs={30110: uln(64, [LZ, NM]), 30320: uln(42, [LZ]), 30184: uln(64, [], optional=[LZ, NM], threshold=1, required_count=NIL_DVN_COUNT)},
		app_configs={30184: uln(0, [], required_count=0)},
	)
	raw = asyncio.run(read_posture(chain, OAPP))
	routes = {p.eid: p for p in raw["pathways"]}
	assert set(routes) == {30110, 30184, 30320}
	assert routes[30320].chain_name == "unichain"
	assert routes[30320].receive.effective_verifiers == 1
	assert [v.name for v in routes[30110].receive.required_dvns] == ["LayerZero Labs", "Nethermind"]
	assert routes[30184].receive.effective_verifiers == 1  # NIL required + 1-of-2 optional
	assert routes[30184].receive.is_default_library is True  # all-zero app config falls through to defaults
	assert raw["owner"].type == "safe" and raw["owner"].threshold == 3 and raw["owner"].owners == 5
	assert raw["delegate"].type == "eoa"
	assert raw["default_confirmations"][30320] == 15

	posture = evaluate(raw)
	assert posture.single_verifier_pathways == 2
	assert {"LZ-SINGLE-VERIFIER", "ADM-EOA-DELEGATE", "LZ-DEFAULT-CONFIG"} <= {f.rule_id for f in posture.findings}


def test_rejects_contracts_that_are_not_oapps():
	chain = FakeChain(receive_configs={}, endpoint_ref="0x" + "99" * 20)
	with pytest.raises(NotAnOApp):
		asyncio.run(read_posture(chain, OAPP))


def test_batch_client_decodes_results_and_isolates_reverts(monkeypatch):
	client = EvmClient(["http://unused"], batch_size=2)
	calls = [
		Call("0x" + "01" * 20, "owner()", returns=("address",)),
		Call("0x" + "01" * 20, "getThreshold()", returns=("uint256",)),
		Call("0x" + "01" * 20, "peers(uint32)", ("uint32",), (30110,), ("bytes32",)),
	]
	answers = {
		calls[0].data(): "0x" + encode(["address"], [SAFE]).hex(),
		calls[2].data(): "0x" + encode(["bytes32"], [b"\x11" * 32]).hex(),
	}

	async def fake_post(payload):
		out = []
		for item in payload:
			data = item["params"][0]["data"]
			if data in answers:
				out.append({"id": item["id"], "result": answers[data]})
			else:
				out.append({"id": item["id"], "error": {"message": "execution reverted"}})
		return out

	monkeypatch.setattr(client, "_post", fake_post)
	owner, threshold, peer = asyncio.run(client.call_many(calls))
	assert owner.lower() == SAFE
	assert isinstance(threshold, CallFailed) and not threshold
	assert peer == b"\x11" * 32
