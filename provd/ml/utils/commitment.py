from __future__ import annotations

from hashlib import sha256


def normalize_identifier(value: str) -> str:
    """Normalize identifier input for stable commitment generation.

    We normalize to lowercase to avoid case-related mismatches across ingestion
    sources (e.g. uppercase wallet strings or hashes).
    """

    normalized = value.strip().lower()
    if not normalized:
        raise ValueError("value must not be empty")
    return normalized


def sha256_commitment(value: str, salt: str) -> str:
    """Return a salted SHA-256 commitment as a lowercase hex digest.

    The function is deterministic for the same `(value, salt)` pair and provides
    cross-partner unlinkability when each partner uses a unique salt.
    """

    if not isinstance(value, str):
        raise TypeError("value must be a string")
    if not isinstance(salt, str):
        raise TypeError("salt must be a string")

    clean_salt = salt.strip()
    if not clean_salt:
        raise ValueError("salt must not be empty")

    normalized_value = normalize_identifier(value)
    payload = f"{clean_salt}:{normalized_value}".encode("utf-8")
    return sha256(payload).hexdigest()


def verify_commitment(value: str, salt: str, commitment: str) -> bool:
    """Verify that a `(value, salt)` pair matches a provided commitment."""

    if not isinstance(commitment, str):
        return False
    candidate = commitment.strip().lower()
    if len(candidate) != 64:
        return False
    return sha256_commitment(value, salt) == candidate
