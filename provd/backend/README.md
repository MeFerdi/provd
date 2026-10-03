# Provd backend

FastAPI service for pre-release transaction risk checks. Product overview and local setup: [root README](../README.md).

```
app/
├── schemas/actions.py   # ActionIntent / ActionScore contract (open enums)
├── adapters/            # base.py (protocol + normalized types), tron.py, stubs.py
├── engine/              # signals.py, scoring.py, config.json (weights), pricing.json
├── services/            # evaluate.py, chain_data.py (cache, risk list, GoPlus), billing.py (quota, ledger)
├── api/v1/actions.py    # evaluate, decisions, outcomes, scanner, usage, pricing, top-ups
├── indexer.py           # freeze-event sync, USDT top-up matching, seed/snapshot
└── seed/                # tron_usdt_frozen.json fixture
```

Commands: `alembic upgrade head` · `python -m app.indexer seed|run [--once]|snapshot` · `python app/main.py` · `python -m pytest`

Legacy tables `score_logs` and `disputes` (migrations 0001–0002) remain but are unused.
