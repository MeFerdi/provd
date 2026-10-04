"""Export the public price list for the website, and optionally the OpenAPI spec for local tooling.

    python -m app.export_contract ../frontend/src/data          # pricing.json (rendered by the pricing page)
    python -m app.export_contract ../frontend/src/data --spec   # also openapi.json, for local use only

The endpoint reference is no longer published on the websites: the playground loads it from
GET /v1/developer/reference with an API key. Never commit openapi.json into a public site.
"""
import json
import sys
from pathlib import Path

from app.main import app
from app.services.billing import public_price_list


def main() -> None:
	args = [a for a in sys.argv[1:] if not a.startswith("--")]
	out = Path(args[0] if args else "../frontend/src/data")
	out.mkdir(parents=True, exist_ok=True)
	(out / "pricing.json").write_text(json.dumps(public_price_list(), indent=1) + "\n")
	print(f"wrote {out / 'pricing.json'}")
	if "--spec" in sys.argv:
		spec = app.openapi()
		(out / "openapi.json").write_text(json.dumps(spec, indent=1, sort_keys=True) + "\n")
		print(f"wrote {out / 'openapi.json'} ({len(spec['paths'])} paths): local use only, don't publish it")


if __name__ == "__main__":
	main()
