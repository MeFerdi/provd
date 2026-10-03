import json, urllib.request, time
SAFE = "0xCbcdd778AA25476F203814214dD3E9b9c46829A1"
def get(url):
    for a in range(6):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent":"provd-research"}), timeout=90))
        except Exception as e: err = e; print("retry", e, flush=True); time.sleep(6 * (a + 1))
    raise err
base = "https://api.safe.global/tx-service/eth/api/v1/safes/"
info = get(base + SAFE + "/")
txs = []; url = base + SAFE + "/multisig-transactions/?executed=true&limit=100"
while url:
    d = get(url); txs += d["results"]; url = d["next"]; print("got", len(txs), flush=True); time.sleep(1.5)
json.dump({"info": info, "txs": txs}, open("safe_txs.json", "w"))
print("done", len(txs))
