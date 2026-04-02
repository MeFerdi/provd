# About Provd

## The problem we are solving

Africa is the world's fastest-growing cryptocurrency market by adoption rate. In Nigeria, Kenya, Ghana, and across Sub-Saharan Africa, millions of people use crypto for remittances, inflation protection, and everyday commerce. The majority of this activity happens peer-to-peer: two people agreeing on a trade, one sending fiat via M-Pesa or a bank transfer, the other sending crypto in return.

This is where the fraud lives.

Not in smart contracts. Not in DeFi protocols. In the moment between "I'll send you the USDT" and the money arriving. The scammer who posts on a Telegram group, receives your mobile money transfer, and disappears. The payment reversal specialist who completes the crypto leg of a trade and then disputes the fiat payment through their bank. The serial actor who is banned on one exchange on Monday and opens a clean account on a different exchange on Tuesday.

Every major blockchain security tool in the world was built to solve a different problem — smart contract audits, DeFi exploit detection, on-chain AML. These tools are well-made and they work for the markets they were built for. They are simply not built for the African P2P context. A smart contract scanner cannot see a Telegram fraud network. A DeFi security protocol cannot flag a payment reversal pattern on MTN Mobile Money.

The gap between the security tooling that exists and the fraud-intelligence layer Africa's crypto markets actually need is the opportunity Provd was built to fill.

---

## What we have built

Provd is a B2B fraud-intelligence API for African crypto exchanges, wallets, stablecoin apps, and OTC desks. Before a P2P trade executes, a partner queries Provd with the counterparty's identifiers — wallet address, hashed phone number, hashed bank account, and payment context. Provd returns a counterparty score, risk flags, and a recommended action in under 200 milliseconds.

The score is powered by a federated fraud intelligence graph built on a GraphSAGE neural network. The graph models relationships between entities — wallets, phone numbers, bank accounts, devices, disputes, and payment rails — across every partner in the Provd network. A fraudulent actor flagged on one platform can inform risk decisions at every other integrated platform. This is the network effect that makes Provd more valuable with every new participant.

We are not trying to replace exchange compliance teams or become another escrow front end. We are giving risk teams the one thing they currently lack: intelligence that crosses platform boundaries.

---

## Why now

Three things are converging that make this the right moment.

Regulatory pressure is increasing. Kenya's Capital Markets Authority, Nigeria's Securities and Exchange Commission, and Ghana's Bank of Ghana are all actively developing user protection requirements for virtual asset service providers. Compliance infrastructure that would have been optional in 2023 is becoming mandatory.

African crypto exchanges are maturing. The first generation of African crypto infrastructure was focused on acquisition and geographic expansion. The second generation is focused on sustainability, unit economics, and protecting the users they have acquired. Fraud losses that were tolerable at early stage become existential at scale.

The technology is ready. Large-scale graph neural networks, fast inference serving, and pre-computed score caching have all reached a maturity point where real-time fraud scoring at API latency is practically achievable. This was not true three years ago at the same cost point.

---

## Our principles

**We score risk, not people.** Our features are behavioral and relational — transaction patterns, graph relationships, dispute history. We do not use demographic attributes. We do not make judgements about individuals based on where they are from. We catch fraud patterns, not people.

**Accuracy is a moral obligation.** A false positive — a legitimate trader wrongly flagged as high-risk — is not an acceptable operational error. It is a real harm. We report confidence intervals alongside scores so exchanges can distinguish strong signals from weak ones. We maintain a feedback loop where false positives are reported, investigated, and used to improve the model.

**Privacy by design, not compliance.** Identifiers are hashed before they reach our infrastructure. We operate a federated intelligence model — we receive anonymized risk signals, not raw personal data. We are compliant with Kenya's Data Protection Act, Nigeria's NDPR, and GDPR principles. This is not a legal requirement imposed on us; it is the architecture we chose because it is the right architecture.

**Built for Africa means built in Africa.** We are headquartered in Nairobi. We build for the chains that dominate African transaction volume — BNB Chain, Tron, Celo — not the chains that dominate Western DeFi. We have relationships with African regulators. We attend African conferences. We are not a Western product with an African market strategy. We are an African product.

---

## The team

Provd was founded in Nairobi in 2026 by a team that has worked across African fintech, blockchain infrastructure, and machine learning. We are researchers, engineers, and operators who have spent years watching African crypto users get defrauded by patterns that existing security tools were never designed to catch.

We are actively hiring across engineering, data science, and business development. If you believe African crypto users deserve fraud defenses as strong as what exists for Western onchain markets, [we want to hear from you](/careers).

---

## Investors and partners

*Coming soon.*
