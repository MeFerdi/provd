import json, urllib.request, time, collections, sys
def get(url):
    for a in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent":"provd-research"}), timeout=60))
        except Exception as e: err = e; time.sleep(4 * (a + 1))
    raise err
agg = collections.defaultdict(lambda: {"count": 0, "names": collections.Counter(), "srcEids": collections.Counter()})
token = None; pages = 0; n = 0
while pages < int(sys.argv[1]):
    url = "https://scan.layerzero-api.com/v1/messages/latest?limit=100" + (f"&nextToken={token}" if token else "")
    d = get(url); pages += 1
    for m in d.get("data", []):
        p = m["pathway"]; n += 1
        if p["dstEid"] != 30101: continue
        r = p["receiver"]; a = agg[r["address"].lower()]
        a["count"] += 1; a["names"][r.get("name") or "unknown"] += 1; a["srcEids"][p["srcEid"]] += 1
    token = d.get("nextToken")
    if not token: break
    time.sleep(0.4)
rows = sorted(({"address": k, "count": v["count"], "name": v["names"].most_common(1)[0][0], "srcEids": dict(v["srcEids"])} for k, v in agg.items()), key=lambda r: -r["count"])
json.dump(rows, open("eth_receivers.json", "w"), indent=1)
print("messages", n, "eth receivers", len(rows))
for r in rows[:40]: print(r["count"], r["address"], r["name"], list(r["srcEids"])[:6])
