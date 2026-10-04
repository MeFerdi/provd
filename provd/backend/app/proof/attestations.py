"""Release attestations: compact decisions a smart contract can verify before releasing funds.

An attestation says "Provd recommended releasing `amount` of the scored payment to `recipient`, valid until
`expiresAt`", bound to one decision (`intentId`, `recordHash`) and one escrow (chain id + contract, or Solana
program). It is signed with secp256k1 over a keccak-256 digest, so contracts verify it natively:

- **EVM and Tron (TVM):** EIP-712 typed data; verify with `ecrecover` (see contracts/ProvdReleaseVerifier.sol).
- **Solana:** a fixed byte layout; verify with `secp256k1_recover` and compare the Ethereum-style signer address.

Attestations use their own key (ATTESTATION_SIGNING_KEY), separate from the decision-record key.
"""
import hashlib
import logging
from dataclasses import dataclass
from functools import lru_cache

from Crypto.Hash import keccak
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from app.config import get_settings

logger = logging.getLogger("provd.proof")

DOMAIN_NAME = "Provd Release Attestation"
DOMAIN_VERSION = "1"
RELEASE_TYPES = {
	"EIP712Domain": [("name", "string"), ("version", "string"), ("chainId", "uint256"), ("verifyingContract", "address")],
	"ReleaseAttestation": [("intentId", "bytes32"), ("recipient", "bytes32"), ("amount", "uint256"), ("expiresAt", "uint64"), ("recordHash", "bytes32")],
}
SOLANA_PREFIX = b"\x19Provd release attestation v1\n"

# secp256k1
_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
_G = (0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798, 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8)


def keccak256(data: bytes) -> bytes:
	return keccak.new(digest_bits=256, data=data).digest()


# --- EIP-712 (generic, so it can be checked against the specification's own example) ----------------------

def _encode_type(primary: str, types: dict) -> str:
	deps: set[str] = set()

	def collect(name: str):
		for _, field_type in types[name]:
			base = field_type.rstrip("[]")
			if base in types and base not in deps and base != primary:
				deps.add(base)
				collect(base)

	collect(primary)
	return "".join(f"{n}({','.join(f'{t} {f}' for f, t in types[n])})" for n in [primary, *sorted(deps)])


def type_hash(primary: str, types: dict) -> bytes:
	return keccak256(_encode_type(primary, types).encode())


def _encode_value(field_type: str, value, types: dict) -> bytes:
	if field_type in types:
		return hash_struct(field_type, value, types)
	if field_type in ("string", "bytes"):
		raw = value.encode() if isinstance(value, str) else bytes(value)
		return keccak256(raw)
	if field_type == "address":
		return bytes(12) + bytes.fromhex(value[2:] if value.startswith("0x") else value)
	if field_type == "bool":
		return int(bool(value)).to_bytes(32, "big")
	if field_type.startswith("uint") or field_type.startswith("int"):
		return int(value).to_bytes(32, "big", signed=field_type.startswith("int"))
	if field_type.startswith("bytes"):
		raw = bytes.fromhex(value[2:]) if isinstance(value, str) else bytes(value)
		return raw.ljust(32, b"\x00")
	raise ValueError(f"unsupported EIP-712 type {field_type}")


def hash_struct(primary: str, data: dict, types: dict) -> bytes:
	encoded = type_hash(primary, types) + b"".join(_encode_value(t, data[f], types) for f, t in types[primary])
	return keccak256(encoded)


def eip712_digest(domain: dict, primary: str, message: dict, types: dict) -> bytes:
	return keccak256(b"\x19\x01" + hash_struct("EIP712Domain", domain, types) + hash_struct(primary, message, types))


# --- secp256k1 helpers: Ethereum address and public-key recovery (for the `v` value) ------------------------

def _add(a, b):
	if a is None:
		return b
	if b is None:
		return a
	if a[0] == b[0] and (a[1] + b[1]) % _P == 0:
		return None
	if a == b:
		lam = 3 * a[0] * a[0] * pow(2 * a[1], -1, _P) % _P
	else:
		lam = (b[1] - a[1]) * pow(b[0] - a[0], -1, _P) % _P
	x = (lam * lam - a[0] - b[0]) % _P
	return x, (lam * (a[0] - x) - a[1]) % _P


def _mul(k: int, point):
	result = None
	while k:
		if k & 1:
			result = _add(result, point)
		point = _add(point, point)
		k >>= 1
	return result


def recover_public_key(digest: bytes, r: int, s: int, recovery_id: int) -> tuple[int, int] | None:
	"""Public key point from a signature over `digest` (as ecrecover does)."""
	if not (0 < r < _N and 0 < s < _N):
		return None
	y_squared = (pow(r, 3, _P) + 7) % _P
	y = pow(y_squared, (_P + 1) // 4, _P)
	if y * y % _P != y_squared:
		return None
	if y % 2 != recovery_id % 2:
		y = _P - y
	z = int.from_bytes(digest, "big")
	r_inv = pow(r, -1, _N)
	return _add(_mul(s * r_inv % _N, (r, y)), _mul((-z * r_inv) % _N, _G))


def eth_address(point: tuple[int, int]) -> str:
	raw = point[0].to_bytes(32, "big") + point[1].to_bytes(32, "big")
	return "0x" + keccak256(raw)[-20:].hex()


def checksum_address(address: str) -> str:
	"""EIP-55 mixed-case checksum."""
	lower = address.lower().removeprefix("0x")
	digest = keccak256(lower.encode()).hex()
	return "0x" + "".join(c.upper() if int(digest[i], 16) >= 8 else c for i, c in enumerate(lower))


@dataclass(frozen=True)
class AttestationSigner:
	private_key: ec.EllipticCurvePrivateKey

	@property
	def point(self) -> tuple[int, int]:
		numbers = self.private_key.public_key().public_numbers()
		return numbers.x, numbers.y

	@property
	def public_key_hex(self) -> str:
		return self.private_key.public_key().public_bytes(Encoding.X962, PublicFormat.CompressedPoint).hex()

	@property
	def address(self) -> str:
		return checksum_address(eth_address(self.point))

	@property
	def key_id(self) -> str:
		return hashlib.sha256(bytes.fromhex(self.public_key_hex)).hexdigest()[:16]

	def sign_digest(self, digest: bytes) -> tuple[int, int, int]:
		"""(r, s, v) with low-s and v in {27, 28}, as ecrecover expects."""
		der = self.private_key.sign(digest, ec.ECDSA(utils.Prehashed(hashes.SHA256())))
		r, s = utils.decode_dss_signature(der)
		if s > _N // 2:
			s = _N - s
		for recovery_id in (0, 1):
			if recover_public_key(digest, r, s, recovery_id) == self.point:
				return r, s, 27 + recovery_id
		raise RuntimeError("could not determine the recovery id")


def _scalar(raw: bytes) -> int:
	value = int.from_bytes(raw, "big") % _N
	if value == 0:
		raise ValueError("invalid secp256k1 private key")
	return value


def _live_material() -> bytes:
	settings = get_settings()
	if settings.attestation_signing_key:
		return bytes.fromhex(settings.attestation_signing_key)
	logger.warning("ATTESTATION_SIGNING_KEY not set; using a development key derived from SECRET_KEY")
	return hashlib.sha256(b"provd-dev-attestation-key|" + settings.secret_key.encode()).digest()


@lru_cache(maxsize=1)
def attestation_signer() -> AttestationSigner:
	return AttestationSigner(ec.derive_private_key(_scalar(_live_material()), ec.SECP256K1()))


@lru_cache(maxsize=1)
def sandbox_attestation_signer() -> AttestationSigner:
	"""Signs sandbox attestations. A different address from the live signer, so contracts that trust Provd's
	live signer reject every sandbox attestation."""
	scalar = _scalar(hashlib.sha256(b"provd-sandbox-attestation-key|" + _live_material()).digest())
	return AttestationSigner(ec.derive_private_key(scalar, ec.SECP256K1()))


# --- the two encodings -------------------------------------------------------------------------------------

def intent_id_hash(intent_id: str) -> bytes:
	return keccak256(intent_id.encode())


def recipient_bytes32(chain: str, address: str) -> bytes:
	"""Tron: the 20-byte TVM address, left-padded (as Solidity's bytes32(uint256(uint160(addr)))).
	Solana: the 32-byte public key."""
	if chain == "tron":
		from app.adapters.tron import b58check_decode

		raw = b58check_decode(address)
		return bytes(12) + raw[1:21]
	if chain == "solana":
		from app.adapters.solana import b58decode

		return b58decode(address)
	raise ValueError(f"no attestation encoding for chain {chain}")


def evm_typed_data(chain_id: int, contract: str, intent_id: bytes, recipient: bytes, amount: int, expires_at: int, record_hash: bytes) -> dict:
	"""The EIP-712 payload, in the JSON shape wallets and ethers.js expect."""
	return {
		"types": {k: [{"name": f, "type": t} for f, t in v] for k, v in RELEASE_TYPES.items()},
		"primaryType": "ReleaseAttestation",
		"domain": {"name": DOMAIN_NAME, "version": DOMAIN_VERSION, "chainId": chain_id, "verifyingContract": checksum_address(contract)},
		"message": {"intentId": "0x" + intent_id.hex(), "recipient": "0x" + recipient.hex(), "amount": str(amount), "expiresAt": expires_at, "recordHash": "0x" + record_hash.hex()},
	}


def evm_digest(typed: dict) -> bytes:
	message = dict(typed["message"])
	return eip712_digest(typed["domain"], "ReleaseAttestation", message, RELEASE_TYPES)


def solana_digest(program_id: bytes, intent_id: bytes, recipient: bytes, amount: int, expires_at: int, record_hash: bytes) -> bytes:
	"""keccak256(prefix || program_id || intent_id || recipient || amount u64 BE || expires_at i64 BE || record_hash)."""
	return keccak256(
		SOLANA_PREFIX + program_id + intent_id + recipient + amount.to_bytes(8, "big") + expires_at.to_bytes(8, "big", signed=True) + record_hash
	)
