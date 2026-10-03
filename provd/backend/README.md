# Provd backend

FastAPI service that reads, rates and monitors the security configuration of LayerZero V2 OApps.
Product overview, local setup and the publication workflow are in the [root README](../README.md).

## Layout

```
app/
├── api/v1/posture.py      # /protocols, /protocols/{slug}, /scan, /early-access
├── api/v1/{auth,keys,clients}.py   # admin credentials and API keys
├── chains/evm.py          # batched JSON-RPC client with endpoint fallback
├── posture/layerzero.py   # collector: peers, libraries, ULN configs, owner/delegate
├── posture/rules.py       # findings + grade (documented on the site's /methodology)
├── posture/diff.py        # change events between two snapshots
├── services/posture.py    # scan, record snapshot, list/detail views
├── services/alerts.py     # webhook / Telegram delivery
├── cli.py                 # seed, refresh, monitor, publish, export-snapshot
└── data/                  # protocols to monitor, LayerZero eid names, DVN registry snapshot
```

## Commands

```bash
alembic upgrade head
uvicorn app.main:app --reload
python -m app.cli seed | refresh [--slug S] | monitor | publish S.. | unpublish S..
python -m app.cli export-snapshot --out PATH [--include-unpublished]
python -m pytest
```

## Configuration

See `.env.example`. Chain endpoints come only from `ETHEREUM_RPC_URLS`; nothing is hardcoded.
Refresh the LayerZero reference data (`app/data/layerzero_*.json`) from
`https://metadata.layerzero-api.com/v1/metadata` when new chains or DVNs launch.

Legacy tables `score_logs` and `disputes` from the earlier product remain in the schema (migrations
0001–0002) but are no longer used by any endpoint.
