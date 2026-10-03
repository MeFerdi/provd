import json, sys, time, urllib.request
RPCS = ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com", "https://rpc.ankr.com/eth", "https://cloudflare-eth.com"]
def rpc(method, params, url=None):
    last = None
    for u in ([url] if url else RPCS):
        for attempt in range(3):
            try:
                req = urllib.request.Request(u, data=json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params}).encode(), headers={"Content-Type":"application/json","User-Agent":"provd-research"})
                d = json.load(urllib.request.urlopen(req, timeout=60))
                if "error" in d: last = d["error"]; break
                return d["result"]
            except Exception as e:
                last = e; time.sleep(1 + attempt)
    raise RuntimeError(f"{method} failed: {last}")
