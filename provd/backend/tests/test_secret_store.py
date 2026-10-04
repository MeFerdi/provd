import pytest

from app import secret_store
from app.config import Settings


def _prod_env(**overrides):
	values = secret_store.generate()
	values.update(
		APP_ENV="production",
		DATABASE_URL="postgresql+asyncpg://provd:" + secret_store.new_value(secret_store.SECRETS[0]) + "@db:5432/provd",
		CORS_ORIGINS="https://provd.tech",
		ALLOWED_HOSTS="api.provd.tech",
		RATE_LIMIT_BACKEND="redis",
	)
	values.update(overrides)
	return values


def _settings(monkeypatch, env):
	for secret in secret_store.SECRETS:
		monkeypatch.delenv(secret.name, raising=False)
	for key, value in env.items():
		if value is not None:
			monkeypatch.setenv(key, value)
	return Settings(_env_file=None)


def test_generated_secrets_are_fresh_and_valid():
	first, second = secret_store.generate(), secret_store.generate()
	assert set(first) == {s.name for s in secret_store.SECRETS if s.kind != "external"}
	assert all(first[name] != second[name] for name in first)
	for name in ("DECISION_SIGNING_KEY", "ATTESTATION_SIGNING_KEY"):
		key = int(first[name], 16)
		assert len(first[name]) == 64 and 0 < key < secret_store._SECP256K1_N
	assert not any(secret_store.looks_like_placeholder(v) for v in first.values())


def test_production_starts_with_generated_secrets(monkeypatch):
	settings = _settings(monkeypatch, _prod_env())
	assert not settings.is_non_production


@pytest.mark.parametrize(
	"overrides, message",
	[
		({"SECRET_KEY": "dev-only-secret-key-change-me-0123456789abcdef"}, "SECRET_KEY"),
		({"BOOTSTRAP_ADMIN_CLIENT_SECRET": "example-admin-secret-xxxxxxxxxxxxxxxx"}, "BOOTSTRAP_ADMIN_CLIENT_SECRET"),
		({"DATABASE_URL": "postgresql+asyncpg://provd:provd@db:5432/provd"}, "DATABASE_URL"),
		({"DATABASE_URL": None}, "DATABASE_URL must be set"),
	],
)
def test_production_refuses_placeholder_or_missing_secrets(monkeypatch, overrides, message):
	with pytest.raises(ValueError, match=message):
		_settings(monkeypatch, _prod_env(**overrides))


def test_secrets_load_from_files(tmp_path):
	key_file = tmp_path / "signing_key"
	key_file.write_text(secret_store.generate()["DECISION_SIGNING_KEY"] + "\n")
	env = {"DECISION_SIGNING_KEY_FILE": str(key_file), "SECRET_KEY": "from-env", "SECRET_KEY_FILE": str(key_file)}
	assert secret_store.load_secret_files(env) == ["DECISION_SIGNING_KEY"]
	assert env["DECISION_SIGNING_KEY"] == key_file.read_text().strip()
	assert env["SECRET_KEY"] == "from-env"  # an explicit variable wins over its file


def test_unreadable_or_empty_secret_file_fails_loudly(tmp_path):
	with pytest.raises(RuntimeError, match="can't be read"):
		secret_store.load_secret_files({"SECRET_KEY_FILE": str(tmp_path / "missing")})
	(tmp_path / "empty").write_text("")
	with pytest.raises(RuntimeError, match="empty"):
		secret_store.load_secret_files({"SECRET_KEY_FILE": str(tmp_path / "empty")})


def test_init_writes_owner_only_files_and_never_overwrites(tmp_path, monkeypatch):
	backend = tmp_path / "backend"
	backend.mkdir()
	(backend / ".env.example").write_text("APP_ENV=development\nSECRET_KEY=\nDATABASE_URL=\n# ATTESTATION_SIGNING_KEY=\n")
	monkeypatch.setattr(secret_store, "BACKEND_DIR", backend)
	monkeypatch.setattr(secret_store, "STACK_DIR", tmp_path)
	backend_env, stack_env = secret_store.init_local()
	text = backend_env.read_text()
	assert "SECRET_KEY=\n" not in text and "ATTESTATION_SIGNING_KEY=" in text and "DECISION_SIGNING_KEY=" in text
	password = stack_env.read_text().split("POSTGRES_PASSWORD=")[1].strip()
	assert f"provd:{password}@localhost" in text
	assert backend_env.stat().st_mode & 0o777 == 0o600 and stack_env.stat().st_mode & 0o777 == 0o600
	with pytest.raises(SystemExit, match="Refusing to overwrite"):
		secret_store.init_local()
