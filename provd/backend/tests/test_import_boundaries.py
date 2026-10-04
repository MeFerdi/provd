"""The scoring engine must stay chain-agnostic: no chain-specific adapter imports outside app/adapters."""
import ast
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app"
CHAIN_NATIVE = {"app.adapters.tron", "app.adapters.solana", "app.adapters.stubs"}
ENGINE_DIRS = [APP / "engine"]


def _imports(path: Path) -> set[str]:
	tree = ast.parse(path.read_text())
	found = set()
	for node in ast.walk(tree):
		if isinstance(node, ast.ImportFrom) and node.module:
			found.add(node.module)
		elif isinstance(node, ast.Import):
			found.update(alias.name for alias in node.names)
	return found


def test_engine_imports_no_chain_native_modules():
	offenders = {}
	for directory in ENGINE_DIRS:
		for path in directory.rglob("*.py"):
			bad = {m for m in _imports(path) if m in CHAIN_NATIVE or m.startswith(("httpx", "sqlalchemy"))}
			if bad:
				offenders[str(path.relative_to(APP))] = sorted(bad)
	assert offenders == {}, f"engine must only use app.adapters.base: {offenders}"
