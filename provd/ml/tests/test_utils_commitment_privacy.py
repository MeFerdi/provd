import numpy as np

from ml.utils.commitment import normalize_identifier, sha256_commitment, verify_commitment
from ml.utils.privacy import laplace_mechanism, privatize_aggregate_series


def test_sha256_commitment_is_stable_with_normalization():
    a = sha256_commitment(" 0xAbC123 ", "partner-salt")
    b = sha256_commitment("0xabc123", "partner-salt")

    assert a == b
    assert len(a) == 64


def test_verify_commitment_success_and_failure_paths():
    value = "User@Example.com"
    salt = "partner-x"
    digest = sha256_commitment(value, salt)

    assert verify_commitment(value, salt, digest)
    assert not verify_commitment("other@example.com", salt, digest)
    assert not verify_commitment(value, salt, "bad")


def test_normalize_identifier_rejects_empty_value():
    try:
        normalize_identifier("   ")
        assert False, "expected ValueError"
    except ValueError:
        assert True


def test_laplace_mechanism_is_reproducible_with_rng():
    rng = np.random.default_rng(42)
    first = laplace_mechanism(10.0, epsilon=1.0, sensitivity=1.0, rng=rng)

    rng = np.random.default_rng(42)
    second = laplace_mechanism(10.0, epsilon=1.0, sensitivity=1.0, rng=rng)

    assert first == second


def test_laplace_mechanism_respects_bounds():
    rng = np.random.default_rng(0)
    value = laplace_mechanism(2.0, epsilon=0.5, min_value=0.0, max_value=5.0, rng=rng)
    assert 0.0 <= value <= 5.0


def test_privatize_aggregate_series_length_and_type():
    rng = np.random.default_rng(7)
    values = [5.0, 10.0, 15.0]
    privatized = privatize_aggregate_series(values, epsilon=1.0, rng=rng)

    assert len(privatized) == len(values)
    assert all(isinstance(v, float) for v in privatized)
