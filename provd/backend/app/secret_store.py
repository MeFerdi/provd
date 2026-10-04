"""The one place Provd's secrets are declared, loaded and checked.

Secrets are never written in code, images or the repository. Each one comes from, in order:
  1. an environment variable (NAME), set by the hosting platform's secret store;
  2. a file named by NAME_FILE (Docker/Kubernetes secrets, or a secrets manager that mounts files);
  3. backend/.env, for local development only (git-ignored; create it with `python -m app.secret_store init`).

  python -m app.secret_store init     # create backend/.env and provd/.env with fresh random development secrets
  python -m app.secret_store check    # list which secrets are set (never prints values)
  python -m app.secret_store generate # print a fresh set to paste into a secret store
"""
from __future__ import annotations

import os
import secrets
import sys
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
STACK_DIR = BACKEND_DIR.parent
_SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141


@dataclass(frozen=True)
class Secret:
	name: str
	purpose: str
	required_in_production: bool = False
	kind: str = "token"  # token | secp256k1 | id | external (issued by a provider, never generated)


SECRETS: tuple[Secret, ...] = (
	Secret("SECRET_KEY", "Signs admin access tokens (JWT)", True),
	Secret("DATABASE_URL", "Postgres connection string, including its password", True, "external"),
	Secret("REDIS_URL", "Redis connection string (rate limits)", False, "external"),
	Secret("DECISION_SIGNING_KEY", "secp256k1 key that signs decision records", True, "secp256k1"),
	Secret("ATTESTATION_SIGNING_KEY", "secp256k1 key that signs release attestations (must differ from the decision key)", True, "secp256k1"),
	Secret("BOOTSTRAP_ADMIN_CLIENT_ID", "Admin client id", True, "id"),
	Secret("BOOTSTRAP_ADMIN_CLIENT_SECRET", "Admin client secret", True),
	Secret("BOOTSTRAP_CLIENT_CLIENT_ID", "Service client id", True, "id"),
	Secret("BOOTSTRAP_CLIENT_CLIENT_SECRET", "Service client secret", True),
	Secret("PAYSTACK_SECRET_KEY", "Paystack API key (card and M-Pesa top-ups)", False, "external"),
	Secret("TRONGRID_API_KEY", "TronGrid API key", False, "external"),
	Secret("GOPLUS_API_KEY", "GoPlus API key", False, "external"),
	Secret("SOLANA_RPC_URL", "Solana RPC URL (Helius/Alchemy URLs embed an API key)", False, "external"),
	Secret("SENTRY_DSN", "Sentry DSN", False, "external"),
)
SECRET_NAMES = frozenset(s.name for s in SECRETS)

# Values that only ever appear in examples, docs or old defaults. Production refuses to start with them.
_PLACEHOLDER_MARKERS = ("change-me", "changeme", "change_me", "dev-only", "example", "placeholder", "your-", "<", "provd:provd@")


def looks_like_placeholder(value: str) -> bool:
	lowered = value.lower()
	return any(marker in lowered for marker in _PLACEHOLDER_MARKERS)


def load_secret_files(environ: dict[str, str] | None = None) -> list[str]:
	"""Fill NAME from the file at NAME_FILE for every declared secret NAME that isn't already set.

	Returns the names loaded. Runs before settings are read, so the app, the worker and migrations all see them.
	"""
	env = os.environ if environ is None else environ
	loaded = []
	for name in SECRET_NAMES:
		path = env.get(f"{name}_FILE")
		if not path or env.get(name):
			continue
		try:
			value = Path(path).read_text(encoding="utf-8").strip()
		except OSError as exc:
			raise RuntimeError(f"{name}_FILE points to {path!r}, which can't be read: {exc.strerror}") from None
		if not value:
			raise RuntimeError(f"{name}_FILE points to an empty file")
		env[name] = value
		loaded.append(name)
	return loaded


def new_value(secret: Secret) -> str:
	if secret.kind == "secp256k1":
		while True:
			key = secrets.token_bytes(32)
			if 0 < int.from_bytes(key, "big") < _SECP256K1_N:
				return key.hex()
	if secret.kind == "id":
		return "provd-" + secrets.token_hex(6)
	return secrets.token_urlsafe(48)


def generate() -> dict[str, str]:
	"""A fresh set of every secret Provd can generate itself (provider keys are issued by the provider)."""
	return {s.name: new_value(s) for s in SECRETS if s.kind != "external"}


def _write_new(path: Path, content: str) -> None:
	# Created with owner-only permissions; refuses to overwrite.
	fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
	with os.fdopen(fd, "w", encoding="utf-8") as handle:
		handle.write(content)


def init_local() -> list[Path]:
	"""Create backend/.env (from .env.example) and provd/.env (compose) with fresh development secrets."""
	backend_env, stack_env = BACKEND_DIR / ".env", STACK_DIR / ".env"
	existing = [p for p in (backend_env, stack_env) if p.exists()]
	if existing:
		raise SystemExit(f"Refusing to overwrite {', '.join(str(p) for p in existing)}. Delete it first to regenerate.")
	values = generate()
	db_password = secrets.token_urlsafe(24)
	values["DATABASE_URL"] = f"postgresql+asyncpg://provd:{db_password}@localhost:5432/provd"

	lines, seen = [], set()
	for line in (BACKEND_DIR / ".env.example").read_text(encoding="utf-8").splitlines():
		key = line.split("=", 1)[0].strip().lstrip("#").strip()
		if "=" in line and key in values and key not in seen:
			lines.append(f"{key}={values[key]}")
			seen.add(key)
		else:
			lines.append(line)
	lines += [f"{k}={v}" for k, v in values.items() if k not in seen]
	_write_new(backend_env, "\n".join(lines) + "\n")
	_write_new(stack_env, f"# docker compose reads this file. Generated by `python -m app.secret_store init`.\nPOSTGRES_PASSWORD={db_password}\n")
	return [backend_env, stack_env]


def status(environ: dict[str, str] | None = None) -> list[tuple[Secret, bool]]:
	from dotenv import dotenv_values

	env = dict(os.environ if environ is None else environ)
	for key, value in dotenv_values(BACKEND_DIR / ".env").items():
		env.setdefault(key, value or "")
	load_secret_files(env)
	return [(s, bool(env.get(s.name))) for s in SECRETS]


def main(argv: list[str]) -> int:
	command = argv[1] if len(argv) > 1 else "check"
	if command == "init":
		for path in init_local():
			print(f"created {path} (owner-only permissions)")
		print("Development secrets only. Production secrets go in your platform's secret store: see DEPLOYMENT.md.")
	elif command == "generate":
		print("# Paste into your secret store. Never commit these.")
		for key, value in generate().items():
			print(f"{key}={value}")
	elif command == "check":
		for secret, present in status():
			need = "required in production" if secret.required_in_production else "optional"
			print(f"{'set    ' if present else 'missing'}  {secret.name:32} {need}: {secret.purpose}")
	else:
		print(__doc__)
		return 2
	return 0


if __name__ == "__main__":
	sys.exit(main(sys.argv))
