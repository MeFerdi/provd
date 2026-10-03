"""Keep withdrawal recipients whose last 60 transactions span at least 7 days (human-paced, not bots).
Writes ../data/human_population.json"""
import glob
import json
from concurrent.futures import ThreadPoolExecutor

import rpc

STABLES = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"}
users = set()
for path in glob.glob("../data/flows_w*.jsonl"):
	for line in open(path):
		users |= {o["to"] for o in json.loads(line)["out"] if o["mint"] in STABLES and o["amount"] >= 10 and o["to"]}


def span(addr):
	try:
		s = rpc.call("getSignaturesForAddress", [addr, {"limit": 60}])
	except Exception:
		return addr, None, 0
	if len(s) < 5:
		return addr, None, len(s)
	return addr, (s[0]["blockTime"] - s[-1]["blockTime"]) / 86400, len(s)


with ThreadPoolExecutor(max_workers=6) as pool:
	rows = list(pool.map(span, sorted(users)))
human = [a for a, d, n in rows if d is not None and d >= 7]
json.dump({"population": len(users), "checked": len(rows), "human_paced": human,
           "spans": {a: [d, n] for a, d, n in rows}}, open("../data/human_population.json", "w"), indent=1)
print("recipients", len(users), "human-paced (60 txs over >= 7 days)", len(human),
      "bot-paced", sum(1 for a, d, n in rows if d is not None and d < 7), "too few txs", sum(1 for a, d, n in rows if d is None))
