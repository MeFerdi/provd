"""Find address-poisoning attempts against payout wallets from ../data/flows_<label>.jsonl.

An attempt = an incoming transfer to the payout wallet from address S where S != R but S shares at least
3 leading and 3 trailing characters with some address R that the wallet paid (random chance ~1 in 3e10).
Writes ../data/poisoning_findings.json
"""
import glob
import json
import os

STABLES = {"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT"}


def affix(a, b):
	pre = 0
	while pre < min(len(a), len(b)) and a[pre] == b[pre]:
		pre += 1
	suf = 0
	while suf < min(len(a), len(b)) and a[-1 - suf] == b[-1 - suf]:
		suf += 1
	return pre, suf


def index(addresses):
	by_key = {}
	for a in addresses:
		by_key.setdefault((a[:3], a[-3:]), set()).add(a)
	return by_key


summary, findings = {}, []
for path in sorted(glob.glob("../data/flows_*.jsonl")):
	label = os.path.basename(path)[6:-6]
	rows = sorted((json.loads(l) for l in open(path)), key=lambda r: r["time"])
	paid_at = {}
	for r in rows:
		for o in r["out"]:
			paid_at.setdefault(o["to"], r["time"])
	idx = index(paid_at)
	attempts, lookalikes, sent_to_lookalike = [], set(), []
	for r in rows:
		for i in r["in"]:
			s = i["from"]
			if not s or s in paid_at:
				continue
			for target in idx.get((s[:3], s[-3:]), ()):
				pre, suf = affix(s, target)
				lead = r["time"] - paid_at[target]
				attempts.append({"wallet": label, "sig": r["sig"], "time": r["time"], "lookalike": s, "imitates": target, "prefix": pre, "suffix": suf,
				                 "token": STABLES.get(i["mint"], i["mint"]), "amount": i["amount"], "seconds_after_payout": lead})
				lookalikes.add(s)
		for o in r["out"]:
			if o["to"] in lookalikes:
				sent_to_lookalike.append({"wallet": label, "sig": r["sig"], "to": o["to"], "token": STABLES.get(o["mint"], o["mint"]), "amount": o["amount"]})
	stable_payouts = sum(1 for r in rows for o in r["out"] if o["mint"] in STABLES)
	span_h = (rows[-1]["time"] - rows[0]["time"]) / 3600 if rows else 0
	summary[label] = {"transactions": len(rows), "hours_covered": round(span_h, 1), "addresses_paid": len(paid_at), "stablecoin_payouts": stable_payouts,
	                  "poisoning_transfers": len(attempts), "distinct_lookalikes": len(lookalikes),
	                  "recipients_imitated": len({a["imitates"] for a in attempts}), "sent_to_lookalike": sent_to_lookalike}
	findings += attempts

json.dump({"summary": summary, "attempts": findings}, open("../data/poisoning_findings.json", "w"), indent=1)
for label, s in summary.items():
	print(label, {k: v for k, v in s.items() if k != "sent_to_lookalike"}, "sent_to_lookalike:", len(s["sent_to_lookalike"]))
if findings:
	leads = sorted(a["seconds_after_payout"] for a in findings)
	print("median seconds after the real payout:", leads[len(leads) // 2])
	from collections import Counter
	print("tokens used:", Counter(a["token"] if len(a["token"]) < 6 else "other token" for a in findings).most_common())
	print("affix match:", Counter((a["prefix"], a["suffix"]) for a in findings).most_common(6))
