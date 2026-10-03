"""Fetch a payout wallet's last N transactions and record every stablecoin/SOL/token movement in or out.

Usage: python3 poisoning_scan.py <label> <address> [N]   -> ../data/flows_<label>.jsonl (resumable)
"""
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import rpc

label, wallet = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
path = f"../data/flows_{label}.jsonl"
done = {json.loads(l)["sig"] for l in open(path)} if os.path.exists(path) else set()
sigs = [s for s in rpc.call("getSignaturesForAddress", [wallet, {"limit": n}]) if not s["err"] and s["signature"] not in done]


def instructions(tx):
	yield from tx["transaction"]["message"]["instructions"]
	for inner in (tx.get("meta") or {}).get("innerInstructions") or []:
		yield from inner["instructions"]


def flows(sig):
	tx = rpc.transaction(sig["signature"])
	if not tx or not tx.get("meta"):
		return {"sig": sig["signature"], "time": sig["blockTime"], "out": [], "in": []}
	meta = tx["meta"]
	delta = {}
	for side, sign in (("preTokenBalances", -1), ("postTokenBalances", 1)):
		for b in meta.get(side) or []:
			owner, mint = b.get("owner"), b["mint"]
			amount = float(b["uiTokenAmount"]["uiAmount"] or 0)
			delta[(owner, mint)] = delta.get((owner, mint), 0.0) + sign * amount
	out, inc = [], []
	mine = {m: d for (o, m), d in delta.items() if o == wallet and abs(d) > 0}
	for mint, d in mine.items():
		others = [(o, dd) for (o, m), dd in delta.items() if m == mint and o != wallet and abs(dd) > 0]
		if d < 0:
			out += [{"to": o, "mint": mint, "amount": dd} for o, dd in others if dd > 0]
		else:
			inc += [{"from": o, "mint": mint, "amount": -dd} for o, dd in others if dd < 0]
	for ix in instructions(tx):
		p = ix.get("parsed")
		if ix.get("program") == "system" and isinstance(p, dict) and p.get("type") == "transfer":
			info = p["info"]
			if info["destination"] == wallet:
				inc.append({"from": info["source"], "mint": "SOL", "amount": info["lamports"] / 1e9})
			elif info["source"] == wallet:
				out.append({"to": info["destination"], "mint": "SOL", "amount": info["lamports"] / 1e9})
	return {"sig": sig["signature"], "time": sig["blockTime"], "out": out, "in": inc}


print(f"{label}: {len(sigs)} to fetch", flush=True)
with open(path, "a") as f, ThreadPoolExecutor(max_workers=6) as pool:
	for i, row in enumerate(pool.map(flows, sigs)):
		f.write(json.dumps(row) + "\n")
		f.flush()
		if i % 100 == 0:
			print(f"{label}: {i}/{len(sigs)}", flush=True)
print(f"{label}: done", flush=True)
