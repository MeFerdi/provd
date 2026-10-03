"""Export the API contract for the frontend: the OpenAPI spec and the public price list.

    python -m app.export_contract ../frontend/src/data

Run after changing endpoints or pricing; the site's API reference and pricing page render from these
files, so they can't drift from the code.
"""
import json
import sys
from pathlib import Path

from app.config import get_settings
from app.main import app
from app.services.billing import pricing


def main() -> None:
	out = Path(sys.argv[1] if len(sys.argv) > 1 else "../frontend/src/data")
	out.mkdir(parents=True, exist_ok=True)
	spec = app.openapi()
	(out / "openapi.json").write_text(json.dumps(spec, indent=1, sort_keys=True) + "\n")
	bundles = pricing()["bundles"]
	(out / "pricing.json").write_text(json.dumps({
		"free_daily_checks": get_settings().free_daily_checks,
		"bundles": {k: {**v, "per_check_usd": round(v["price_usd"] / v["checks"], 4)} for k, v in bundles.items()},
		"payment_methods": ["usdt_tron", "mpesa"],
	}, indent=1) + "\n")
	print(f"wrote {out / 'openapi.json'} ({len(spec['paths'])} paths) and {out / 'pricing.json'}")


if __name__ == "__main__":
	main()
