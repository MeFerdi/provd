# Kelp DAO rsETH exploit — configuration replay (April 18, 2026)

On 2026-04-18 at 17:35:35 UTC (Ethereum block 24,908,285) an attacker delivered a forged LayerZero message
from Unichain to Kelp's rsETH OFT adapter on Ethereum and released 116,500 rsETH (~$292M).
Public reporting disagreed on the root cause: one analysis said the adapter was *deployed* with one verifier,
LayerZero's report said it was *downgraded* from 2-of-2 to 1-of-1. We rebuilt the configuration history
from public on-chain data to settle it.

## Findings

| | |
|---|---|
| Exploited pathway | Unichain (eid 30320) → Ethereum, receive library `ReceiveUln302` |
| Its verifier set at exploit | **1 required DVN (LayerZero Labs), 0 optional** |
| When that was set | **2025-04-02 08:14 UTC** — tx `0x2d48d9331d…` — **381 days before the exploit** |
| Who set it | `0xCF7b…5662`, an **EOA** that held the adapter's LayerZero delegate role from 2025-01-02 to 2025-08-25 |
| Receive pathways configured at exploit | 26, of which **24 single-verifier** (LayerZero Labs only) |
| The "downgrade" | Real, but in **March 2024**: Blast and Mode went from 2-of-2 (LayerZero Labs + Polyhedra zkBridge) to 1-of-1 on 2024-03-21 — **758 days before the exploit** |
| Later pathways | Six more pathways opened 1-of-1 by the 3-of-6 Safe between 2025-09-15 and 2026-04-01 |
| After the exploit | 2026-04-23: all pathways moved to 4 required DVNs (Horizen, LayerZero Labs, Canary, Nethermind). 2026-06-15: all peers removed |

**Both public accounts were partly right.** There was a 2-of-2 → 1-of-1 downgrade, but two years earlier, and
the exploited pathway was never anything but 1-of-1. Every one of these settings was public, on-chain, and
readable with a single `eth_call` the entire time.

A second finding the reporting did not cover: for ~20 months the adapter's verifier configuration could be
changed by a single private key (the deployer EOA, then another EOA), not the protocol's multisig.

## Method

1. Decode the exploit's `PacketDelivered` event → source eid 30320, OApp `0x85d4…8ef3` (`RSETH_OFTAdapter`).
2. `EndpointV2.delegates(oapp)` and the adapter's `setDelegate` history → three delegates over time.
3. Decode every `EndpointV2.setConfig` call made by each delegate (Blockscout for the EOAs, the Safe
   Transaction Service for the Safe) and replay the ULN (config type 2) changes in time order.
4. Cross-check: the current `getConfig` for eid 30320 matches the Safe's 2026-04-23 configuration.
5. DVN names from LayerZero's public metadata registry (`data/layerzero_dvns_snapshot.json`).

Limitation: free RPC endpoints don't serve historical state, so the posture is reconstructed from config
transactions rather than read with historical `eth_call`. An archive node can confirm each point directly.

## Reproduce

```bash
cd scripts && python -m venv .v && .v/bin/pip install eth-abi eth-utils pycryptodome
.v/bin/python replay.py
```

Data: `data/kelp_facts.json` (summary), `data/replay_events.json` (every decoded config change).
