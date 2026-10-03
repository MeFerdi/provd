"""Lower-bound census of tokens on Solana that use the symbol of a real stablecoin or tokenized stock
but aren't the issuer's mint. Source: Jupiter token search (top results per query, so a lower bound).

Writes ../data/lookalike_tokens.json
"""
import json
import time
import urllib.parse
import urllib.request

OFFICIAL = {
	"USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
	"USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
}
STABLE_QUERIES = ["USDC", "USD Coin", "USDT", "Tether", "USD₮", "USDC.e", "USDCoin", "TetherUSD"]
STOCK_SYMBOLS = ["TSLAx", "NVDAx", "AAPLx", "SPYx", "MSTRx", "COINx", "GOOGLx", "METAx", "AMZNx", "QQQx", "CRCLx", "HOODx"]


def search(q):
	url = "https://lite-api.jup.ag/tokens/v2/search?" + urllib.parse.urlencode({"query": q})
	req = urllib.request.Request(url, headers={"user-agent": "provd-research/1.0"})
	for attempt in range(5):
		try:
			return json.load(urllib.request.urlopen(req, timeout=30))
		except OSError:
			time.sleep(2 ** attempt)
	return []


def row(t):
	return {k: t.get(k) for k in ("id", "name", "symbol", "isVerified", "tags", "holderCount", "liquidity", "mcap", "usdPrice", "tokenProgram", "freezeAuthority", "mintAuthority", "createdAt", "firstPool")}


tokens = {}
for q in STABLE_QUERIES + STOCK_SYMBOLS:
	for t in search(q):
		tokens[t["id"]] = t
	time.sleep(0.4)

stable, stocks = [], {}
for t in tokens.values():
	sym = (t.get("symbol") or "").strip()
	if sym.upper() in OFFICIAL and t["id"] != OFFICIAL[sym.upper()]:
		stable.append(row(t))
	for s in STOCK_SYMBOLS:
		if sym.upper() == s.upper():
			stocks.setdefault(s, []).append(row(t))

json.dump({"generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "stablecoin_lookalikes": stable, "stock_symbol_tokens": stocks}, open("../data/lookalike_tokens.json", "w"), indent=1)

print(f"stablecoin lookalikes (symbol USDC/USDT, not the official mint): {len(stable)}")
for t in sorted(stable, key=lambda t: -(t["holderCount"] or 0))[:12]:
	print(f"  {t['symbol']:5} holders={t['holderCount']!s:>7} liq=${(t['liquidity'] or 0):>12,.0f} price={t['usdPrice']} verified={t['isVerified']} {t['name'][:30]!r} {t['id']}")
print()
for s, ts in stocks.items():
	ver = [t for t in ts if t["isVerified"]]
	print(f"{s:7} tokens with this symbol: {len(ts):2}  verified: {len(ver)}  unverified holders: {sum((t['holderCount'] or 0) for t in ts if not t['isVerified'])}")
