"""Did the poisoning lookalike addresses receive real money (>= $1 USDC/USDT or >= 0.01 SOL) from anyone?
Window: what PublicNode retains (~1 day). Writes ../data/lookalike_inflows.json"""
import json
from concurrent.futures import ThreadPoolExecutor

import rpc

STABLES = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT"}
lookalikes = sorted({a["lookalike"] for a in json.load(open("../data/user_poisoning.json"))["attempts"]})


def inflows(addr):
	sigs = rpc.call("getSignaturesForAddress", [addr, {"limit": 200}])
	got, sent_dust = [], 0
	for s in sigs:
		if s["err"]:
			continue
		tx = rpc.transaction(s["signature"])
		if not tx or not tx.get("meta"):
			continue
		delta = {}
		for side, sign in (("preTokenBalances", -1), ("postTokenBalances", 1)):
			for b in tx["meta"].get(side) or []:
				if b.get("owner") == addr and b["mint"] in STABLES:
					delta[b["mint"]] = delta.get(b["mint"], 0) + sign * float(b["uiTokenAmount"]["uiAmount"] or 0)
		keys = [k["pubkey"] if isinstance(k, dict) else k for k in tx["transaction"]["message"]["accountKeys"]]
		i = keys.index(addr)
		sol = (tx["meta"]["postBalances"][i] - tx["meta"]["preBalances"][i]) / 1e9
		for mint, d in delta.items():
			if d >= 1:
				got.append({"sig": s["signature"], "token": STABLES[mint], "amount": round(d, 6), "time": s["blockTime"]})
			elif d < 0:
				sent_dust += 1
		if sol >= 0.01:
			got.append({"sig": s["signature"], "token": "SOL", "amount": round(sol, 6), "time": s["blockTime"]})
	return addr, {"transactions": len(sigs), "dust_sent": sent_dust, "real_inflows": got}


with ThreadPoolExecutor(max_workers=4) as pool:
	result = dict(pool.map(inflows, lookalikes))
json.dump(result, open("../data/lookalike_inflows.json", "w"), indent=1)
hits = {a: r for a, r in result.items() if r["real_inflows"]}
print("lookalikes", len(result), "with real inflows", len(hits))
print("total txs on lookalikes", sum(r["transactions"] for r in result.values()), "dust sends seen", sum(r["dust_sent"] for r in result.values()))
for a, r in hits.items():
	print(a, r["real_inflows"])
