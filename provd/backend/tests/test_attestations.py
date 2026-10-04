"""Release attestations: EIP-712 correctness (against the specification's example), issuing rules, and both encodings."""
from datetime import timedelta

import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from app.proof import attestations as att
from app.services import chain_data
from tests.test_lookalike import PAYEE_STRONG, FakeSolana
from tests.test_rails_api import CLEAN, EXPOSED, env, intent  # noqa: F401  (env is a fixture)

ESCROW = "0x1234567890AbcdEF1234567890aBcdef12345678"
PROGRAM = "11111111111111111111111111111111"  # a valid 32-byte public key (the system program) as a stand-in


def test_eip712_matches_the_specification_example():
	types = {
		"EIP712Domain": [("name", "string"), ("version", "string"), ("chainId", "uint256"), ("verifyingContract", "address")],
		"Person": [("name", "string"), ("wallet", "address")],
		"Mail": [("from", "Person"), ("to", "Person"), ("contents", "string")],
	}
	domain = {"name": "Ether Mail", "version": "1", "chainId": 1, "verifyingContract": "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"}
	mail = {
		"from": {"name": "Cow", "wallet": "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},
		"to": {"name": "Bob", "wallet": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},
		"contents": "Hello, Bob!",
	}
	digest = att.eip712_digest(domain, "Mail", mail, types)
	assert digest.hex() == "be609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2"
	r = 0x4355C47D63924E8A72E509B65029052EB6C299D53A04E167C5775FD466751C9D
	s = 0x07299936D304C153F6443DFA05F40FF007D72911B6F72307F996231605B91562
	assert att.checksum_address(att.eth_address(att.recover_public_key(digest, r, s, 1))) == "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
	cow = att.AttestationSigner(ec.derive_private_key(int.from_bytes(att.keccak256(b"cow"), "big"), ec.SECP256K1()))
	assert cow.address == "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"


def _recovered(digest_hex: str, sig: dict) -> str:
	digest = bytes.fromhex(digest_hex[2:])
	point = att.recover_public_key(digest, int(sig["r"], 16), int(sig["s"], 16), sig["v"] - 27)
	return att.checksum_address(att.eth_address(point))


def test_evm_attestation_for_a_released_tron_trade(env):  # noqa: F811
	client, *_ = env
	decision = client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_id="trade-77", amounts={"crypto": 500})).json()
	assert decision["recommended_action"] == "release"
	body = {"target": "evm", "chain_id": 728126428, "verifying_contract": ESCROW, "amount_base_units": 500_000_000, "ttl_seconds": 99999}
	a = client.post("/v1/decisions/trade-77/attestation", json=body)
	assert a.status_code == 201, a.text
	a = a.json()
	typed = a["typed_data"]
	assert typed["domain"] == {"name": "Provd Release Attestation", "version": "1", "chainId": 728126428, "verifyingContract": att.checksum_address(ESCROW)}
	assert typed["message"]["intentId"] == "0x" + att.keccak256(b"trade-77").hex()
	assert typed["message"]["recordHash"] == "0x" + decision["decision_record_hash"]
	assert typed["message"]["recipient"] == "0x" + att.recipient_bytes32("tron", CLEAN).hex()
	assert typed["message"]["recipient"].startswith("0x000000000000000000000000")  # a 20-byte TVM address, left-padded
	assert a["digest"] == "0x" + att.evm_digest(typed).hex()
	keys = client.get("/v1/proof/keys").json()
	assert _recovered(a["digest"], a["signature"]) == a["signer"]["address"] == keys["attestation_signer"]["address"]
	assert keys["attestation_signer"]["public_key"] != keys["keys"][0]["public_key"]  # separate from the record key
	assert typed["message"]["expiresAt"] - int(decision_time(decision)) <= 3600 + 5  # ttl capped at the maximum


def decision_time(decision):
	from datetime import datetime

	return datetime.fromisoformat(decision["created_at"].replace("Z", "+00:00")).timestamp()


def test_attestation_rules(env):  # noqa: F811
	client, tron, who, *_ = env
	evm = {"target": "evm", "chain_id": 1, "verifying_contract": ESCROW, "amount_base_units": 1}
	assert client.post("/v1/decisions/nope/attestation", json=evm).status_code == 404
	client.post("/v1/actions/evaluate", json=intent(EXPOSED, intent_id="held", amounts={"crypto": 10}))
	assert client.post("/v1/decisions/held/attestation", json=evm).status_code == 409  # a hold is never attested
	client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_id="no-amount"))
	assert client.post("/v1/decisions/no-amount/attestation", json=evm).status_code == 422
	who["client"] = "platform-b"
	assert client.post("/v1/decisions/held/attestation", json=evm).status_code == 404  # other accounts can't see it


def test_amount_target_and_domain_checks(env, monkeypatch):  # noqa: F811
	from app.config import get_settings

	client, *_ = env
	monkeypatch.setenv("FREE_MONTHLY_CHECKS", "50")
	get_settings.cache_clear()
	client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_id="t1", amounts={"crypto": "12.5"}))
	base = {"target": "evm", "chain_id": 1, "verifying_contract": ESCROW}
	assert client.post("/v1/decisions/t1/attestation", json={**base, "amount_base_units": 12_500_001}).status_code == 422
	assert client.post("/v1/decisions/t1/attestation", json={**base, "amount_base_units": 12_500_000}).status_code == 201
	assert client.post("/v1/decisions/t1/attestation", json={"target": "solana", "program_id": PROGRAM, "amount_base_units": 1}).status_code == 422
	assert client.post("/v1/decisions/t1/attestation", json={"target": "evm", "amount_base_units": 1}).status_code == 422
	assert client.post("/v1/decisions/t1/attestation", json={**base, "verifying_contract": "0x12", "amount_base_units": 1}).status_code == 422


def test_solana_attestation_layout(env):  # noqa: F811
	client, *_ = env
	chain_data.set_adapter("solana", FakeSolana())
	try:
		decision = client.post("/v1/actions/evaluate", json=intent(PAYEE_STRONG, chain="solana", intent_type="p2p_trade", intent_id="sol-1", amounts={"crypto": 3})).json()
		assert decision["recommended_action"] == "release"
		a = client.post("/v1/decisions/sol-1/attestation", json={"target": "solana", "program_id": PROGRAM, "amount_base_units": 3_000_000}).json()
		f = a["fields"]
		from app.adapters.solana import b58decode

		expected = att.solana_digest(
			b58decode(PROGRAM), att.keccak256(b"sol-1"), b58decode(PAYEE_STRONG), 3_000_000, f["expires_at"], bytes.fromhex(decision["decision_record_hash"])
		)
		assert a["digest"] == "0x" + expected.hex() and f["recipient"] == "0x" + b58decode(PAYEE_STRONG).hex()
		assert _recovered(a["digest"], a["signature"]) == a["signer"]["address"]
		assert len(bytes.fromhex(a["signature"]["bytes"][2:])) == 65
	finally:
		chain_data.set_adapter("solana", None)
