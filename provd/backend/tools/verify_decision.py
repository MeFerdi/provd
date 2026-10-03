#!/usr/bin/env python3
"""Verify a Provd decision record independently.

    curl -s -H "X-API-Key: $KEY" https://api.provd.tech/v1/decisions/<intent_id> > decision.json
    pip install cryptography            # for the signature check
    python verify_decision.py decision.json [--public-key <hex from /v1/proof/keys>]

Checks: (1) record hash, (2) secp256k1 signature, (3) Merkle inclusion in the batch root. Then prints
the root so you can check the anchor yourself:  ots verify -d <root> batch.ots
"""
import argparse
import hashlib
import json
import sys


def canonical(record: dict) -> bytes:
    return json.dumps(record, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def fold(record_hash: str, proof: list[dict]) -> str:
    current = hashlib.sha256(b"\x00" + bytes.fromhex(record_hash)).digest()
    for step in proof:
        sibling = bytes.fromhex(step["hash"])
        pair = sibling + current if step["side"] == "left" else current + sibling
        current = hashlib.sha256(b"\x01" + pair).digest()
    return current.hex()


def verify_signature(public_key_hex: str, digest_hex: str, signature_hex: str) -> bool:
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec, utils

    key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256K1(), bytes.fromhex(public_key_hex))
    raw = bytes.fromhex(signature_hex)
    der = utils.encode_dss_signature(int.from_bytes(raw[:32], "big"), int.from_bytes(raw[32:], "big"))
    try:
        key.verify(der, bytes.fromhex(digest_hex), ec.ECDSA(utils.Prehashed(hashes.SHA256())))
        return True
    except InvalidSignature:
        return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("decision_json")
    parser.add_argument("--public-key", help="pin the key from /v1/proof/keys instead of trusting the one in the file")
    args = parser.parse_args()
    bundle = json.load(open(args.decision_json))
    ok = True

    computed = hashlib.sha256(canonical(bundle["record"])).hexdigest()
    hash_ok = computed == bundle["record_hash"]
    print(f"[{'ok' if hash_ok else 'FAIL'}] record hash {computed}")
    ok &= hash_ok

    sig = bundle.get("signature")
    if sig:
        public_key = args.public_key or sig.get("public_key")
        sig_ok = bool(public_key) and verify_signature(public_key, bundle["record_hash"], sig["value"])
        print(f"[{'ok' if sig_ok else 'FAIL'}] signature by key {sig.get('key_id')}")
        ok &= sig_ok
    else:
        print("[--] not signed")

    merkle = bundle.get("merkle")
    if merkle:
        root = fold(bundle["record_hash"], merkle["proof"])
        merkle_ok = root == merkle["root"]
        print(f"[{'ok' if merkle_ok else 'FAIL'}] merkle inclusion, leaf {merkle['leaf_index']} -> root {root}")
        ok &= merkle_ok
        anchor = (bundle.get("batch") or {}).get("anchor") or {}
        print(f"[..] anchor: {anchor.get('method')} {anchor.get('status')} {anchor.get('reference') or ''}")
        if anchor.get("proof_url"):
            print(f"     verify yourself: download {anchor['proof_url']} then `ots verify -d {root} <file>.ots`")
    else:
        print("[--] not batched yet (batches seal every few minutes)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
