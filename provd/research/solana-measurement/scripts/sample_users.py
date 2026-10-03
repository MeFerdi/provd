"""Pick a random sample of ordinary stablecoin users: recipients of >= $10 USDC/USDT withdrawals from the
scanned payout wallets (excluding the payout wallets themselves). Writes ../data/user_sample.json"""
import glob
import json
import random

STABLES = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"}
random.seed(20261003)
users = set()
for path in glob.glob("../data/flows_w*.jsonl"):
	for line in open(path):
		r = json.loads(line)
		users |= {o["to"] for o in r["out"] if o["mint"] in STABLES and o["amount"] >= 10 and o["to"]}
sample = random.sample(sorted(users), min(80, len(users)))
json.dump({"population": len(users), "sample": sample}, open("../data/user_sample.json", "w"), indent=1)
print("eligible users", len(users), "sampled", len(sample))
