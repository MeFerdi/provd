"""Classify every transaction signed by a stablecoin's freeze authority: freezeAccount / thawAccount / mint / other.

Usage: python3 classify_authority.py usdc|usdt   (reads ../data/<coin>_authority_signatures.json)
Writes ../data/<coin>_authority_actions.jsonl (resumable).
"""
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import rpc

MINTS = {"usdc": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "usdt": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"}
coin = sys.argv[1]
mint = MINTS[coin]
sigs = [s for s in json.load(open(f"../data/{coin}_authority_signatures.json")) if not s["err"]]
out_path = f"../data/{coin}_authority_actions.jsonl"
done = set()
if os.path.exists(out_path):
	done = {json.loads(l)["sig"] for l in open(out_path)}


def instructions(tx):
	msg = tx["transaction"]["message"]
	yield from msg["instructions"]
	for inner in (tx.get("meta") or {}).get("innerInstructions") or []:
		yield from inner["instructions"]


def classify(sig):
	tx = rpc.transaction(sig["signature"])
	actions = []
	for ix in instructions(tx) if tx else []:
		parsed = ix.get("parsed")
		if not isinstance(parsed, dict) or ix.get("program") not in ("spl-token", "spl-token-2022"):
			continue
		info = parsed.get("info", {})
		kind = parsed.get("type")
		if kind in ("freezeAccount", "thawAccount") and info.get("mint") == mint:
			actions.append({"type": kind, "account": info.get("account")})
		elif kind in ("mintTo", "mintToChecked") and info.get("mint") == mint:
			amount = info.get("amount") or (info.get("tokenAmount") or {}).get("amount")
			actions.append({"type": "mint", "amount": int(amount) / 1e6 if amount else None})
		elif kind in ("burn", "burnChecked") and info.get("mint") == mint:
			actions.append({"type": "burn"})
	return {"sig": sig["signature"], "time": sig["blockTime"], "actions": actions or [{"type": "other"}]}


todo = [s for s in sigs if s["signature"] not in done]
print(f"{coin}: {len(todo)} to classify ({len(done)} done)", flush=True)
with open(out_path, "a") as f, ThreadPoolExecutor(max_workers=4) as pool:
	for i, row in enumerate(pool.map(classify, todo)):
		f.write(json.dumps(row) + "\n")
		if i % 500 == 0:
			f.flush()
			print(f"{coin}: {i}/{len(todo)}", flush=True)
print(f"{coin}: done", flush=True)
