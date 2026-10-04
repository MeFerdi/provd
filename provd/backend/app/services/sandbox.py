"""Sandbox: a safe test mode for developers and the playground.

Sandbox API keys score against fixed test wallets instead of live blockchain data. Nothing is charged, no chain
provider is called, decisions are never anchored to Bitcoin, and decision records and release attestations are
signed with sandbox keys (derived from, but never equal to, the live keys). A sandbox attestation therefore can
never release funds from a contract that trusts Provd's live signer.

Every sandbox account is separate from the live one ("sbx_<client>"), so test decisions and outcomes never
mix with real ones. Any valid address that isn't a test wallet scores as a brand-new wallet with no history.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from functools import lru_cache

from app.adapters.base import NormalizedHistory, NormalizedTransfer

SANDBOX_PREFIX = "sbx_"  # live account ids are UUIDs, so they never start with this
SANDBOX_REFERENCE = "SANDBOX TEST ENTITY (test data, not a real listing)"

# Fixed test wallets. Valid addresses, derived from public seeds; the lookalikes share 4+ leading and trailing
# characters with "clean", the way address-poisoning attacks do.
WALLETS: dict[str, dict[str, str]] = {
	"tron": {
		"clean": "TGQTkjNT8AshaqvD2W9pATZkTXBzsC764D",
		"lookalike": "TGQTkjNT8AshVHrsxg8b5ogTSb7SoD764D",
		"sanctioned": "TFcnVpSZ1WRtRJez83eptKrSezwhtTU7ZM",
		"exposure": "TPHQXVjCnq5BrvVPBPTimfuecZn9zzqRDw",
		"frozen": "TYR31YEWenbeLjq7H9aRTJHYWhDjjBhz82",
		"dust": "TEdgNsTUvbQRhuffhoLF84WdpE7LVGRT99",
		"new": "TT5WntFnuqoDtafg2C7Sbx2q7xmZEZyK1y",
	},
	"solana": {
		"clean": "5kZVvftu4P3vapZ7drYEW4vaGz7TTwA3pTX6dJPTTJ3t",
		"lookalike": "5kZVfPG7AQy1FAUXLnFBgPH7H4iuWPF3zM1YA6txTJ3t",
		"sanctioned": "5AqeXr6zFYem8HuKFLodyekK9inVn1xnDwbdCju7PhgY",
		"exposure": "Aq62Svynhf3ZiWVPEp5hiTsgYc1PPJXEe9FnC7YD81bv",
		"frozen": "Ha6P5vnnw6QLYFQvh1GvLt1dDfqrgtgJoiUiW7wUTrCR",
		"dust": "4SgRorKbzExJbQjxT5EGxxh82aGt2BpB2chtXuaBw7i9",
		"new": "DdauGqS6etf35GEd131rKh88HNs21mTBMStpWLkUh1AA",
	},
}
_PEERS = {
	"tron": ["TGMJ55CfSJUMwqXrz1TXNQttzLqBD1wTgZ", "TLFMNN23kq9oBs7UQWTdAQZdoSWRSyoBju", "TDMmKxiGYt9zUBzeHCo217sD3V1vTNrG6z", "TVqRyvMhFk234hnXRiutFZpBrsZetXE2Vm", "TAwq74cQQm6Abxjaxu9oBPZp7RE7mktrUD", "TVPijKNh11NEsAjEqjQMtsKYfg1vqsvaZt", "TVp53zGTZPwD4BxG8hoK8y8EV4Q1X2g8za", "TNZpAsjZTXaBhS7LHMJ8KAaTizxxh2aZDV", "THK2GynHnNmKqpxFpZUurE77smeX1UPDK7", "TTP9xm5KL9jfXukuxBnNvxgA5qG6bX3RwP", "TB81j3YHxrtXRxY64kYYrcPMJ5z2c8dfJ6", "TH3gmt2D5sf4qqTRiNdscc1UBfHToMCssG"],
	"solana": ["5iDtiFkDps3sBgMWGEGzkcDeoWrfShgkB6VoCy6dax2d", "8b7VcDWE32kqhJwFAkLnPDQHGYmTjw2kWazLksyAgCJq", "3W7TE87aDLS2Uwu12E8GyxyJNK58DsnmA6h4YvnLwkP5", "FfeSdhE3xRoMpgsKrinpWg49RN2C4pxUjFXzvrvTQFJ8", "ioY5zvRaAruteESNhBSqrvEcTWvafcqMvJbybAB1Scu", "FLfWF4kNWVdoYv3MXDu3qgkm4HLfizYLXTN7UsoSDV1q", "FeeAuiyFiWNr17TGCvUjxjEFsSK612yR4CNhwJnzMe2b", "AJP526UaXXkJXt7K2rGuLyAqA5yq6Y6jb1zSzDQPHRhP", "6RN7YvEgXGUHgcLh2fz1KCRoX7gvqCYWEi4kXVjnKvnj", "DrcGjP7kKW3ocws7PAmrRTJB2zVSvU2tGtkoffiCXXUm", "rKa3uSAFyQ4HdjWU8Pc4Zkd9dNWhwcHCYYxS4ecMExF", "6E3Rh2GMQbEWkvxCjEzMXSibmmHiRmms8ZSyUNcRK2yV"],
}
_SANCTIONED_PEERS = {
	"tron": ["TSwkFMBXMyYY9qsAEb5KXXXqqPQyzyFPxX", "TCoCZEpskymhQ2SnynQBHgYM89DAjSJypp", "TMdZGAHs5ZdvTXEjHVzb63CKSJfTHXoJCE"],
	"solana": ["DXrHJC2iCpSbEURHUQ1bHFJAP68GicSV8o5jgPyawr1T", "3653L7H52trSyPCfFhuRZnCBv1HB1WATS1D4SjfgLs22", "9cKpWqefE4uphoBYX5CGrvvMxp4KECM8bR6RNmJWkGbs"],
}
_FREEZE_SOURCE = {"tron": "tether_usdt_freeze", "solana": "circle_usdc_freeze_solana"}
_STABLE = {"tron": "USDT_TRC20", "solana": "USDC"}
_NATIVE = {"tron": "TRX", "solana": "SOL"}

SCENARIOS = [
	{"wallet": "clean", "expect": "release", "flags": [], "what": "An established wallet with normal counterparties."},
	{"wallet": "lookalike", "expect": "reject", "flags": ["LOOKALIKE_DESTINATION", "DUST_SENDER"], "what": "Imitates the clean wallet (same first and last 4 characters) and only sends dust. Send the clean wallet in known_counterparties to see LOOKALIKE_DESTINATION."},
	{"wallet": "sanctioned", "expect": "reject", "flags": ["SANCTIONED_ADDRESS"], "what": "On the sanctions list (a sandbox entry)."},
	{"wallet": "exposure", "expect": "hold", "flags": ["SANCTIONS_EXPOSURE"], "what": "About a tenth of its volume is with a sanctioned wallet."},
	{"wallet": "frozen", "expect": "reject", "flags": ["CP_ADDRESS_FROZEN"], "what": "Frozen by the stablecoin issuer."},
	{"wallet": "dust", "expect": "hold", "flags": ["DUST_SENDER"], "what": "Only sends dust and never receives real value: an address-poisoning bot."},
	{"wallet": "new", "expect": "release", "flags": ["CP_NO_HISTORY"], "what": "A brand-new wallet with no history. Any valid address that isn't listed here behaves the same."},
]


def is_sandbox_account(account_id: str | None) -> bool:
	return bool(account_id) and account_id.startswith(SANDBOX_PREFIX)


def account_id(base: str) -> str:
	"""The sandbox twin of a live account id (a UUID): "sbx_" + 32 hex characters, fitting the same columns."""
	return SANDBOX_PREFIX + base.replace("-", "")[:32]


def scenarios() -> dict:
	return {
		"chains": {chain: dict(wallets) for chain, wallets in WALLETS.items()},
		"scenarios": SCENARIOS,
		"notes": [
			"Sandbox checks are free and use these test wallets only; nothing touches live blockchain data.",
			"Outcomes you report in the sandbox affect only your sandbox checks.",
			"Sandbox records and attestations are signed with sandbox keys (GET /v1/proof/keys, 'sandbox'). They are never anchored and never valid against live contracts.",
		],
	}


def _role(chain: str, address: str) -> str | None:
	for role, wallet in WALLETS.get(chain, {}).items():
		if wallet == address:
			return role
	return None


def _seeded_amount(*parts: object) -> Decimal:
	digest = hashlib.sha256("|".join(map(str, parts)).encode()).digest()
	return Decimal(50 + int.from_bytes(digest[:2], "big") % 1950)


def _transfers(chain: str, wallet: str, peers: list[str], now: datetime, count: int, days: int, tag: str) -> list[NormalizedTransfer]:
	asset, out = _STABLE[chain], []
	for i in range(count):
		peer = peers[i % len(peers)]
		incoming = i % 3 != 0
		when = now - timedelta(days=days * (i + 1) / (count + 1), hours=i % 7)
		out.append(NormalizedTransfer(
			chain, f"sandbox-{tag}-{i}", when, peer if incoming else wallet, wallet if incoming else peer, asset, _seeded_amount(tag, i),
		))
	return out


def _dust(chain: str, wallet: str, now: datetime, tag: str) -> NormalizedHistory:
	native, peers = _NATIVE[chain], _PEERS[chain]
	transfers = [
		NormalizedTransfer(chain, f"sandbox-{tag}-{i}", now - timedelta(hours=i * 5), wallet, peer, _STABLE[chain], Decimal("0.001"))
		for i, peer in enumerate(peers)
	]
	natives = [NormalizedTransfer(chain, f"sandbox-{tag}-n{i}", now - timedelta(hours=i * 5 + 1), wallet, peer, native, Decimal("0.0001")) for i, peer in enumerate(peers[:6])]
	return NormalizedHistory(chain, wallet, transfers=transfers, native_transfers=natives)


def history(chain: str, wallet: str, now: datetime | None = None) -> NormalizedHistory:
	"""The fixed history of a test wallet, or an empty one for any other address (a brand-new wallet)."""
	now = now or datetime.now(timezone.utc)
	role = _role(chain, wallet)
	if role in ("lookalike", "dust"):
		return _dust(chain, wallet, now, role)
	if role in (None, "new"):
		return NormalizedHistory(chain, wallet)
	peers = list(_PEERS[chain])
	if role == "exposure":
		peers = peers[:10] + _SANCTIONED_PEERS[chain][:1]  # about a tenth of its volume
	return NormalizedHistory(chain, wallet, transfers=_transfers(chain, wallet, peers, now, 36, 300, role))


@lru_cache(maxsize=4)
def _flags(chain: str) -> dict[str, str]:
	flags = {a: "ofac_sdn" for a in _SANCTIONED_PEERS[chain]}
	flags[WALLETS[chain]["sanctioned"]] = "ofac_sdn"
	flags[WALLETS[chain]["frozen"]] = _FREEZE_SOURCE[chain]
	return flags


def public_flags(chain: str, addresses: set[str]) -> dict[str, str]:
	flags = _flags(chain) if chain in WALLETS else {}
	return {a: flags[a] for a in addresses if a in flags}


def flag_references(addresses: set[str]) -> dict[str, str]:
	return {a: SANDBOX_REFERENCE for a in addresses}
