import hashlib

import pytest

from app.proof import merkle
from app.proof.signing import SECP256K1_N, signer, verify


def h(i) -> str:
	return hashlib.sha256(str(i).encode()).hexdigest()


def test_signature_verifies_is_low_s_and_detects_tampering():
	key = signer()
	digest = h("record")
	sig = key.sign(digest)
	assert len(sig) == 128 and verify(key.public_key_hex, digest, sig)
	assert int(sig[64:], 16) <= SECP256K1_N // 2
	assert not verify(key.public_key_hex, h("other"), sig)
	assert key.key_id == hashlib.sha256(bytes.fromhex(key.public_key_hex)).hexdigest()[:16]


@pytest.mark.parametrize("size", list(range(1, 34)))
def test_every_leaf_proves_into_the_root(size):
	hashes = [h(i) for i in range(size)]
	root, proofs = merkle.build(hashes)
	assert all(merkle.root_from_proof(x, p) == root for x, p in zip(hashes, proofs))
	if size == 1:
		assert root == merkle.leaf_hash(hashes[0]).hex() and proofs == [[]]


def test_tampered_leaf_or_proof_fails():
	hashes = [h(i) for i in range(5)]
	root, proofs = merkle.build(hashes)
	assert merkle.root_from_proof(h("forged"), proofs[2]) != root
	bad = [dict(step) for step in proofs[2]]
	bad[0]["side"] = "left" if bad[0]["side"] == "right" else "right"
	assert merkle.root_from_proof(hashes[2], bad) != root


def test_leaf_cannot_masquerade_as_node():
	a, b = h(1), h(2)
	root, _ = merkle.build([a, b])
	inner = merkle.node_hash(merkle.leaf_hash(a), merkle.leaf_hash(b)).hex()
	assert root == inner and merkle.build([inner])[0] != root
