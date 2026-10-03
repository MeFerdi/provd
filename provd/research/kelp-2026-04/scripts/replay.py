"""Reconstruct the receive-side DVN configuration history of Kelp's rsETH OFT adapter on Ethereum.

Every account that has been the adapter's LayerZero delegate (two EOAs, then a Safe) is walked for
EndpointV2.setConfig calls; each ULN config is decoded and replayed in time order to get the posture
at the exploit block. Public data only: Blockscout, the Safe Transaction Service, LayerZero metadata.

    python -m venv .v && .v/bin/pip install eth-abi eth-utils pycryptodome
    .v/bin/python replay.py   # writes ../data/replay_events.json and prints the posture table
"""
import datetime
import json
import time
import urllib.request
from pathlib import Path

from eth_abi import decode
from eth_utils import keccak

ENDPOINT = "0x1a44076050125825900e736c501f859c50fe728c"
OAPP = "0x85d456b2dff1fd8245387c0bfb64dfb700e98ef3"  # RSETH_OFTAdapter
RECEIVE_LIB = "0xc02ab410f0734efa3f14628780e6e695156024c2"  # ReceiveUln302
EXPLOIT = datetime.datetime(2026, 4, 18, 17, 35, 35, tzinfo=datetime.UTC)  # block 24908285
EOA_DELEGATES = {
	"0x1f7A03b70C5448DFd0a2C5a7865169253c2C769b": "deployer EOA",
	"0xCF7bF9D3a485b9c4d4A38d65e4d68e081a585662": "delegate EOA",
}
SAFE = "0xCbcdd778AA25476F203814214dD3E9b9c46829A1"
ULN = "(uint64,uint8,uint8,uint8,address[],address[])"
SET_CONFIG = "0x" + keccak(text="setConfig(address,address,(uint32,uint32,bytes)[])")[:4].hex()
DATA = Path(__file__).resolve().parents[1] / "data"


def get(url: str) -> dict:
	for attempt in range(6):
		try:
			req = urllib.request.Request(url, headers={"User-Agent": "provd-research"})
			return json.load(urllib.request.urlopen(req, timeout=60))
		except Exception as exc:  # noqa: BLE001 - public APIs rate-limit; back off and retry
			error = exc
			time.sleep(6 * (attempt + 1))
	raise error


def dvn_names() -> dict[str, str]:
	registry = json.load(open(DATA / "layerzero_dvns_snapshot.json"))
	chain = next(c for c in registry.values() if isinstance(c, dict) and c.get("chainName") == "ethereum")
	return {addr.lower(): meta.get("canonicalName", addr) for addr, meta in chain["dvns"].items()}


def uln_event(ts: str, tx: str, eid: int, raw: bytes, by: str, names: dict[str, str]) -> dict:
	(cfg,) = decode([ULN], raw)
	return {
		"ts": ts, "tx": tx, "eid": eid, "by": by, "confirmations": cfg[0], "required": cfg[1],
		"optional": cfg[2], "threshold": cfg[3],
		"dvns": [names.get(a.lower(), a) for a in cfg[4]],
		"optional_dvns": [names.get(a.lower(), a) for a in cfg[5]],
	}


def eoa_events(names: dict[str, str]) -> list[dict]:
	events = []
	for account, label in EOA_DELEGATES.items():
		url, params = f"https://eth.blockscout.com/api/v2/addresses/{account}/transactions", ""
		hashes = []
		while True:
			page = get(url + params)
			hashes += [t["hash"] for t in page.get("items", []) if (t.get("to") or {}).get("hash", "").lower() == ENDPOINT]
			nxt = page.get("next_page_params")
			if not nxt:
				break
			params = "?" + "&".join(f"{k}={v}" for k, v in nxt.items())
			time.sleep(1.2)
		for tx_hash in hashes:
			tx = get(f"https://eth.blockscout.com/api/v2/transactions/{tx_hash}")
			time.sleep(1)
			if tx.get("status") != "ok" or not (tx.get("raw_input") or "").startswith(SET_CONFIG):
				continue
			oapp, lib, items = decode(["address", "address", "(uint32,uint32,bytes)[]"], bytes.fromhex(tx["raw_input"][10:]))
			if oapp.lower() != OAPP or lib.lower() != RECEIVE_LIB:
				continue
			events += [uln_event(tx["timestamp"], tx_hash, eid, raw, label, names) for eid, kind, raw in items if kind == 2]
	return events


def safe_events(names: dict[str, str]) -> list[dict]:
	url = f"https://api.safe.global/tx-service/eth/api/v1/safes/{SAFE}/multisig-transactions/?executed=true&limit=100"
	events = []
	while url:
		page = get(url)
		for tx in page["results"]:
			decoded = tx.get("dataDecoded") or {}
			calls = (
				[(c["to"], c.get("dataDecoded") or {}) for c in decoded["parameters"][0].get("valueDecoded") or []]
				if decoded.get("method") == "multiSend"
				else [(tx["to"], decoded)]
			)
			for to, call in calls:
				if to.lower() != ENDPOINT or call.get("method") != "setConfig":
					continue
				params = {p["name"]: p["value"] for p in call["parameters"]}
				if params["_oapp"].lower() != OAPP or params["_lib"].lower() != RECEIVE_LIB:
					continue
				for eid, kind, raw in params["_params"]:
					if int(kind) == 2:
						events.append(uln_event(tx["executionDate"], tx["transactionHash"], int(eid), bytes.fromhex(raw[2:]), "3-of-6 Safe", names))
		url = page["next"]
		time.sleep(1.5)
	return events


def main() -> None:
	names = dvn_names()
	chains = {int(k): v for k, v in json.load(open(DATA / "eid_names.json")).items()}
	parse = lambda ts: datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))  # noqa: E731
	events = sorted(eoa_events(names) + safe_events(names), key=lambda e: parse(e["ts"]))
	json.dump(events, open(DATA / "replay_events.json", "w"), indent=1)

	posture = {}
	for event in events:
		if parse(event["ts"]) <= EXPLOIT:
			posture[event["eid"]] = event
	single = [e for e in posture.values() if e["required"] == 1 and e["optional"] == 0]
	print(f"Receive pathways at exploit: {len(posture)}; single-verifier: {len(single)}")
	for eid, event in sorted(posture.items(), key=lambda kv: parse(kv[1]["ts"])):
		age = (EXPLOIT - parse(event["ts"])).days
		print(f"{eid} {chains.get(eid, '?'):<20} since {event['ts'][:10]} ({age:>3}d) required={event['required']} {event['dvns']} set by {event['by']}")


if __name__ == "__main__":
	main()
