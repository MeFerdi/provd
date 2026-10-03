"""Current frozen USDC/USDT token accounts on Solana (token account state byte == 2 'frozen')."""
import base64
import json

import base58_min as b58
import rpc

MINTS = {"USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"}
out = {}
for coin, mint in MINTS.items():
	accounts = rpc.call("getProgramAccounts", ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", {
		"encoding": "base64", "dataSlice": {"offset": 32, "length": 40},
		"filters": [{"dataSize": 165}, {"memcmp": {"offset": 0, "bytes": mint}}, {"memcmp": {"offset": 108, "bytes": "3"}}],
	}])
	rows = []
	for a in accounts:
		raw = base64.b64decode(a["account"]["data"][0])
		rows.append({"token_account": a["pubkey"], "owner": b58.encode(raw[:32]), "balance": int.from_bytes(raw[32:40], "little") / 1e6})
	out[coin] = rows
	print(coin, "frozen accounts:", len(rows), "frozen balance:", f"{sum(r['balance'] for r in rows):,.2f}")
json.dump(out, open("../data/frozen_accounts.json", "w"), indent=1)
