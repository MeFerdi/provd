"""Decision signatures: ECDSA over secp256k1, signing the 32-byte SHA-256 record hash.

Signatures are compact r||s (64 bytes, hex) with low-S normalisation. Anyone can verify with the
published public key (compressed SEC1) using any standard secp256k1 library.
"""
import hashlib
import logging
from dataclasses import dataclass
from functools import lru_cache

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from app.config import get_settings

logger = logging.getLogger("provd.proof")
SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
ALGORITHM = "ecdsa-secp256k1-sha256"


@dataclass(frozen=True)
class DecisionSigner:
	private_key: ec.EllipticCurvePrivateKey

	@property
	def public_key_hex(self) -> str:
		return self.private_key.public_key().public_bytes(Encoding.X962, PublicFormat.CompressedPoint).hex()

	@property
	def key_id(self) -> str:
		return hashlib.sha256(bytes.fromhex(self.public_key_hex)).hexdigest()[:16]

	def sign(self, digest_hex: str) -> str:
		der = self.private_key.sign(bytes.fromhex(digest_hex), ec.ECDSA(utils.Prehashed(hashes.SHA256())))
		r, s = utils.decode_dss_signature(der)
		if s > SECP256K1_N // 2:
			s = SECP256K1_N - s
		return (r.to_bytes(32, "big") + s.to_bytes(32, "big")).hex()


def verify(public_key_hex: str, digest_hex: str, signature_hex: str) -> bool:
	public_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256K1(), bytes.fromhex(public_key_hex))
	raw = bytes.fromhex(signature_hex)
	der = utils.encode_dss_signature(int.from_bytes(raw[:32], "big"), int.from_bytes(raw[32:], "big"))
	try:
		public_key.verify(der, bytes.fromhex(digest_hex), ec.ECDSA(utils.Prehashed(hashes.SHA256())))
		return True
	except InvalidSignature:
		return False


def _scalar(raw: bytes) -> int:
	value = int.from_bytes(raw, "big") % SECP256K1_N
	if value == 0:
		raise ValueError("invalid secp256k1 private key")
	return value


def _live_material() -> bytes:
	settings = get_settings()
	if settings.decision_signing_key:
		return bytes.fromhex(settings.decision_signing_key)
	# Development only (config validation requires a real key outside dev): derive from SECRET_KEY.
	logger.warning("DECISION_SIGNING_KEY not set; using a development key derived from SECRET_KEY")
	return hashlib.sha256(b"provd-dev-decision-key|" + settings.secret_key.encode()).digest()


@lru_cache(maxsize=1)
def signer() -> DecisionSigner:
	return DecisionSigner(ec.derive_private_key(_scalar(_live_material()), ec.SECP256K1()))


@lru_cache(maxsize=1)
def sandbox_signer() -> DecisionSigner:
	"""Signs sandbox decision records: a one-way derivation of the live key, so it can't reveal or equal it."""
	scalar = _scalar(hashlib.sha256(b"provd-sandbox-decision-key|" + _live_material()).digest())
	return DecisionSigner(ec.derive_private_key(scalar, ec.SECP256K1()))


def signer_for(account_id: str | None) -> DecisionSigner:
	from app.services.sandbox import is_sandbox_account

	return sandbox_signer() if is_sandbox_account(account_id) else signer()
