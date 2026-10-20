# Solana on-chain measurement (2026-10-03)

Question: which Provd angle is real on Solana? We measured four things from public mainnet data:
issuer freezes, counterfeit stablecoins, counterfeit tokenized stocks, and address poisoning.

Data sources: Solana JSON-RPC (`api.mainnet-beta.solana.com` for account queries and signature lists;
`solana-rpc.publicnode.com` for transactions, which keeps about one day of history) and Jupiter's token
search API. Scripts are in `scripts/`, raw results in `data/`.

## Results

### 1. Issuer freezes: a much smaller risk list than on Tron

| | Frozen token accounts on Solana | Balance frozen |
|---|---|---|
| USDC (Circle) | 20 | $4.3M |
| USDT (Tether) | 30 | $32.9M |
| For comparison: USDT on Tron | 7,727 frozen addresses | |

Counted directly: every USDC/USDT token account whose on-chain state is "frozen"
(`scripts/frozen_accounts.py`). Circle's current freeze authority has signed 26 successful
transactions since August 2024 (17 freezes, 4 unfreezes).

**Meaning:** on Tron, "this wallet traded with frozen wallets" is Provd's strongest day-one signal.
On Solana, freezes are few and targeted (large balances, probably law-enforcement requests), so that
signal will rarely fire. Provd's value on Solana has to come from somewhere else.

### 2. Counterfeit stablecoins: common, but they reach almost nobody

At least 46 tokens use the symbol USDC or USDT without being the real mint (lower bound: Jupiter
returns only its top results per query). Almost all are joke memecoins (for example, "Upside Down Cat",
ticker USDC) priced at fractions of a cent, with a few hundred holders at most.

### 3. Counterfeit tokenized stocks: same picture

| | Real token | Copies with the same ticker |
|---|---|---|
| 12 major tokenized stocks (TSLAx, NVDAx, SPYx, CRCLx and others) | 528,122 holders, $25M to $85M each | 3 to 17 per ticker, **1,540 holders in total (0.29%)**, almost no liquidity |

**Meaning:** a "real asset or fake?" check is cheap to add, but it isn't a problem people are paying
for today. Not a lead angle.

### 4. Address poisoning: frequent, automated, and aimed at ordinary payers

**Exchange payout wallets are not targeted.** Four high-volume exchange payout wallets: 3,810
transactions, 3,217 addresses paid, **zero** lookalike dust transfers. Their withdrawals are
automated, so nobody copies addresses out of the history, and poisoning them is pointless.

**People who pay others by hand are targeted heavily.** 147 randomly sampled active, non-bot wallets
that had just received a USDC/USDT withdrawal of $10 or more (from 567 eligible):

| | |
|---|---|
| Wallets targeted within about one day | **20 of 147 (13.6%; 95% CI 9% to 20%)** |
| ...where the lookalike imitated someone the wallet had just paid | 19 |
| Dust transfers | 84, from 37 lookalike addresses |
| Tokens used | real USDC (43), real USDT (30), SOL (11) |
| Time from the real payment to the first dust | median **5 minutes**, often within 6 seconds |
| Pattern | 0.0001 then 0.001 tokens about 5 minutes apart, from an address matching the payee's first 4 and last 4 characters |

Example: a wallet pays `2rZawsWv…Y98Vm`; 6 seconds later it receives 0.0001 USDT from
`2rZZFTjj…Y98Vm`, then 0.001 USDT five minutes later. A random address matching 3 leading and
3 trailing characters happens about 1 in 30 billion times, so every match is a generated lookalike.

**Losses:** none of the 37 lookalikes received real money within the one-day window we could see.
Lookalikes are single-use per target and wait for the victim to copy the address later, which free
RPC history can't follow. Measuring losses needs 30 to 90 days of history (a free Helius or Alchemy
API key).

## What this means for Provd on Solana

1. **The angle with evidence: "Is this destination the one you meant?"** Before a platform releases a
   payout, check the destination against the platform's own past payees: does it look like an address
   you've paid before without being it? Was it created minutes after a real payment and has it only
   ever sent dust? This uses each platform's own history, which is Provd's moat, and it fires in exactly
   the flows Provd sells to: P2P desks and payout operations that pay recurring counterparties.
2. **Don't lead with the frozen-wallet list on Solana.** Keep it, but it will rarely fire.
3. **Counterfeit-asset checks are a cheap extra, not a product.** The fakes exist; the victims mostly don't.
4. **Tokenized assets as the main angle: not supported by the data.**

## Limits

- One day of transaction history (PublicNode); attempts within the window are reliable, losses are not.
- Exchange wallet labels come from public reputation, not verified on-chain labels; the finding
  doesn't depend on who owns them.
- 26 of the 150 user scans stopped early on rate limits; this can only undercount poisoning.
- Counterfeit token counts are lower bounds (top search results only).

## Next

1. Get a free Helius or Alchemy API key and re-run the user scan over 90 days to measure losses
   (how often victims later send real money to a lookalike, and how much).
2. Ask 5 Solana payout and P2P teams whether they've sent funds to a lookalike address.
3. Check what wallets already warn about (Phantom and others flag some poisoning) so the pitch is
   about the platform's payout flow, not the end user's wallet.
