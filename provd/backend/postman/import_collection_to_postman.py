#!/usr/bin/env python3
"""Import a Postman collection into a Postman workspace using Postman API.

Usage:
  export POSTMAN_API_KEY=pmak_xxx
  python import_collection_to_postman.py \
    --collection-file ./provd-backend-api.postman_collection.json \
    --workspace-id <workspace-id>
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

POSTMAN_COLLECTIONS_API = "https://api.getpostman.com/collections"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import a collection to Postman")
    parser.add_argument(
        "--collection-file",
        default="./provd-backend-api.postman_collection.json",
        help="Path to a Postman collection JSON file",
    )
    parser.add_argument(
        "--workspace-id",
        required=True,
        help="Postman workspace id where the collection should be imported",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Postman API key (optional if POSTMAN_API_KEY env var is set)",
    )
    return parser.parse_args()


def load_collection(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"Collection file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def import_collection(api_key: str, workspace_id: str, collection: dict) -> dict:
    payload = json.dumps({"collection": collection}).encode("utf-8")
    request = urllib.request.Request(
        url=f"{POSTMAN_COLLECTIONS_API}?workspace={workspace_id}",
        data=payload,
        method="POST",
        headers={
            "X-Api-Key": api_key,
            "Content-Type": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    args = parse_args()
    api_key = args.api_key
    if not api_key:
        import os

        api_key = os.getenv("POSTMAN_API_KEY")

    if not api_key:
        print("Error: provide --api-key or set POSTMAN_API_KEY", file=sys.stderr)
        return 1

    try:
        collection = load_collection(Path(args.collection_file))
        response = import_collection(api_key, args.workspace_id, collection)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        print(f"Postman API error: HTTP {exc.code}\n{body}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Unexpected error: {exc}", file=sys.stderr)
        return 1

    collection_info = response.get("collection", {})
    print("Imported successfully")
    print(f"collection_uid: {collection_info.get('uid', 'n/a')}")
    print(f"collection_name: {collection_info.get('name', 'n/a')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
