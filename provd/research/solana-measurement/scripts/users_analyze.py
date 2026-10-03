"""Address-poisoning prevalence among sampled ordinary stablecoin users (../data/flows_u*.jsonl).

Per user: counterparties they paid (out) and received from (in). A poisoning transfer is an incoming
transfer from S (S not a real counterparty) sharing >=3 leading and >=3 trailing characters with a
counterparty C. A loss is a later outgoing transfer of >= $1 stablecoin (or >= 0.01 SOL) to such an S.
Writes ../data/user_poisoning.json
"""
import glob
import json
import os
from statistics import median

STABLES = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT"}


def match(a, b):
	return a != b and a[:3] == b[:3] and a[-3:] == b[-3:]


users, attempts, losses = [], [], []
for path in sorted(glob.glob("../data/flows_u*.jsonl")):
	label = os.path.basename(path)[6:-6]
	rows = sorted((json.loads(l) for l in open(path)), key=lambda r: r["time"])
	if not rows:
		continue
	paid, received, first_seen = set(), set(), {}
	lookalikes = {}
	user_attempts = 0
	for r in rows:
		for i in r["in"]:
			s = i["from"]
			if not s:
				continue
			targets = [c for c in paid | received if match(s, c)]
			if targets and s not in paid:
				user_attempts += 1
				kind = "paid" if any(t in paid for t in targets) else "received"
				lookalikes[s] = kind
				attempts.append({"user": label, "sig": r["sig"], "time": r["time"], "lookalike": s, "imitates": targets[0], "imitates_kind": kind,
				                 "token": STABLES.get(i["mint"], "SOL" if i["mint"] == "SOL" else "other"), "amount": i["amount"],
				                 "seconds_after_contact": r["time"] - first_seen.get(targets[0], r["time"])})
			else:
				received.add(s)
				first_seen.setdefault(s, r["time"])
		for o in r["out"]:
			t = o["to"]
			if not t:
				continue
			big = (o["mint"] in STABLES and o["amount"] >= 1) or (o["mint"] == "SOL" and o["amount"] >= 0.01)
			if t in lookalikes and big:
				losses.append({"user": label, "sig": r["sig"], "to": t, "token": STABLES.get(o["mint"], o["mint"]), "amount": o["amount"]})
			if t not in lookalikes:
				paid.add(t)
				first_seen.setdefault(t, r["time"])
	users.append({"user": label, "transactions": len(rows), "days_covered": round((rows[-1]["time"] - rows[0]["time"]) / 86400, 1),
	              "counterparties": len(paid | received), "paid": len(paid), "poisoning_transfers": user_attempts,
	              "lookalikes": len(lookalikes), "lookalikes_of_payees": sum(1 for k in lookalikes.values() if k == "paid")})

hit = [u for u in users if u["poisoning_transfers"]]
hit_paid = [u for u in users if u["lookalikes_of_payees"]]
payers = [u for u in users if u["paid"]]
result = {
	"users_scanned": len(users),
	"median_days_covered": median(u["days_covered"] for u in users) if users else 0,
	"users_with_any_poisoning": len(hit),
	"users_who_pay_others": len(payers),
	"payers_with_lookalike_of_a_payee": len([u for u in hit_paid if u["paid"]]),
	"poisoning_transfers": len(attempts),
	"distinct_lookalike_addresses": len({a["lookalike"] for a in attempts}),
	"median_seconds_after_real_contact": median(a["seconds_after_contact"] for a in attempts) if attempts else None,
	"tokens_used": {k: sum(1 for a in attempts if a["token"] == k) for k in {a["token"] for a in attempts}},
	"losses": losses,
	"users": users,
	"attempts": attempts,
}
json.dump(result, open("../data/user_poisoning.json", "w"), indent=1)
print({k: v for k, v in result.items() if k not in ("users", "attempts")})
