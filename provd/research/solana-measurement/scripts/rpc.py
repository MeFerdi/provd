"""Minimal Solana JSON-RPC client for the public endpoint, with retry/backoff for rate limits."""
import json
import time
import urllib.request

RPC = "https://solana-rpc.publicnode.com"  # api.mainnet-beta throttles getTransaction hard


def call(method, params, retries=8):
	body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
	delay = 1.0
	for _ in range(retries):
		try:
			req = urllib.request.Request(RPC, body, {"content-type": "application/json", "user-agent": "provd-research/1.0"})
			data = json.load(urllib.request.urlopen(req, timeout=60))
			if "error" in data:
				if data["error"].get("code") in (429, -32429) or "rate" in str(data["error"]).lower():
					raise RuntimeError("rate")
				raise ValueError(data["error"])
			return data["result"]
		except (RuntimeError, OSError):
			time.sleep(delay)
			delay = min(delay * 2, 30)
	raise RuntimeError(f"{method} failed after retries")


def signatures(address, limit=None, before=None, until=None):
	"""All signatures for an address, newest first (paginated)."""
	out, cursor = [], before
	while True:
		params = {"limit": 1000}
		if cursor:
			params["before"] = cursor
		if until:
			params["until"] = until
		page = call("getSignaturesForAddress", [address, params])
		out += page
		if len(page) < 1000 or (limit and len(out) >= limit):
			return out[:limit] if limit else out
		cursor = page[-1]["signature"]


def transaction(sig):
	return call("getTransaction", [sig, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}])
