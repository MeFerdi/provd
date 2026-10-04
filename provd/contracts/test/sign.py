"""Sign a release attestation with Provd's code: argv = key_hex chain_id contract recipient_evm amount expires record_hash_hex intent_id"""
import json, sys
from cryptography.hazmat.primitives.asymmetric import ec
from app.proof import attestations as att
key_hex, chain_id, contract, recipient, amount, expires, record_hash, intent_id = sys.argv[1:9]
signer = att.AttestationSigner(ec.derive_private_key(int(key_hex, 16), ec.SECP256K1()))
recipient32 = bytes(12) + bytes.fromhex(recipient[2:])
typed = att.evm_typed_data(int(chain_id), contract, att.intent_id_hash(intent_id), recipient32, int(amount), int(expires), bytes.fromhex(record_hash))
digest = att.evm_digest(typed)
r, s, v = signer.sign_digest(digest)
print(json.dumps({"typed": typed, "digest": "0x" + digest.hex(), "r": "0x%064x" % r, "s": "0x%064x" % s, "v": v,
                  "signature": "0x%064x%064x%02x" % (r, s, v), "signer": signer.address}))
