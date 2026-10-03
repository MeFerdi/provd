"""Merkle batches of decision hashes.

leaf = SHA256(0x00 || record_hash)        node = SHA256(0x01 || left || right)
An odd node at the end of a level is promoted unchanged. Domain separation stops a leaf being passed
off as an internal node. A proof is the list of sibling hashes from leaf to root, each tagged with the
side it sits on.
"""
import hashlib


def leaf_hash(record_hash_hex: str) -> bytes:
	return hashlib.sha256(b"\x00" + bytes.fromhex(record_hash_hex)).digest()


def node_hash(left: bytes, right: bytes) -> bytes:
	return hashlib.sha256(b"\x01" + left + right).digest()


def build(record_hashes: list[str]) -> tuple[str, list[list[dict]]]:
	"""Return (root_hex, proofs) where proofs[i] proves record_hashes[i]."""
	if not record_hashes:
		raise ValueError("cannot build an empty tree")
	level = [leaf_hash(h) for h in record_hashes]
	positions = list(range(len(level)))  # position of each original leaf within the current level
	proofs: list[list[dict]] = [[] for _ in record_hashes]
	while len(level) > 1:
		for leaf, pos in enumerate(positions):
			sibling = pos ^ 1
			if sibling < len(level):
				proofs[leaf].append({"side": "left" if sibling < pos else "right", "hash": level[sibling].hex()})
		nxt = [node_hash(level[i], level[i + 1]) if i + 1 < len(level) else level[i] for i in range(0, len(level), 2)]
		positions = [pos // 2 for pos in positions]
		level = nxt
	return level[0].hex(), proofs


def root_from_proof(record_hash_hex: str, proof: list[dict]) -> str:
	current = leaf_hash(record_hash_hex)
	for step in proof:
		sibling = bytes.fromhex(step["hash"])
		current = node_hash(sibling, current) if step["side"] == "left" else node_hash(current, sibling)
	return current.hex()
