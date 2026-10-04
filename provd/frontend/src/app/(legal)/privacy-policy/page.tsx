import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Privacy Policy | Provd",
  description: "What personal data Provd collects, why, and your rights.",
};

const content = `
## Who we are

Provd Technologies Ltd. ("Provd", "we"), a company based in Kenya, operates provd.tech and the Provd API. Provd checks stablecoin payments before platforms release them: P2P trades, on- and off-ramp transactions, payouts and escrow releases. Contact: [hello@provd.tech](mailto:hello@provd.tech).

## What we collect

**Account and contact details.** When you email us or get an API key we keep your name, work email and organisation, and use them to run your account and contact you about Provd.

**Payments.** When you buy checks, we keep the purchase (bundle, amount, currency, status and payment reference). Card and M-Pesa payments are processed by Paystack on its own secure pages: we never see or store card numbers or M-Pesa PINs, and we receive only the email you give for the receipt and the payment result. For USDT top-ups we record the incoming transaction on the public blockchain.

**What platforms send us to check.** API customers send the payments they want checked: counterparty wallet addresses, rails, amounts and, optionally:
- a phone identifier, which must be a hash (HMAC or SHA-256); we reject raw phone numbers;
- an address book of wallets they have paid before, used to catch lookalike addresses;
- account-takeover signals from their own providers (for example the time of a recent SIM swap);
- their own reference data.

This is stored in the decision record for that check. Outcomes a platform reports (for example a reversal) are used only for that platform's own checks and are never pooled with other customers.

**Release attestations.** When a platform asks us to sign a release for its escrow contract, we record what we signed: the decision, recipient wallet, amount, contract and expiry.

**Public checks.** When you use the free counterparty or lookalike check on our website, we receive the wallet address you check and, for the lookalike check, the addresses you paste. The pasted list is used for that check only and is not stored.

**Technical logs.** Our servers and hosting provider record standard request data (IP address, user agent, requested URL, time, request ID). We use it to run the service, prevent abuse and enforce rate limits.

**Browser storage.** The website keeps your theme choice and your recent counterparty checks in your browser's local storage. They are never sent to us. See the [Cookie Policy](/cookie-policy).

We do not use advertising trackers, and we do not sell or share personal data for marketing.

## Public blockchain data and public lists

Checks are built partly from public data: a wallet's on-chain transfers, addresses frozen by stablecoin issuers (Tether, Circle), and addresses on the US Treasury OFAC sanctions list, including the names of sanctioned entities published on that list. Wallet addresses may belong to individuals. We show them only to explain a check.

## Decision records and Bitcoin timestamps

Every check produces a decision record, signed by Provd. To prove records weren't changed later, we combine their fingerprints (hashes) into a single value and timestamp it on the Bitcoin blockchain through OpenTimestamps. Only that combined hash leaves our systems; no personal data is written to Bitcoin.

## How long we keep it

- Account details: while your account is active, and until you ask us to delete them.
- Decision records and attestations: for as long as the customer needs them to verify past checks for audit, or until the customer asks us to delete them. Hashes already timestamped on Bitcoin can't be removed, but they reveal nothing about the record.
- Payment records: as long as required for accounting and tax.
- Technical logs: for a limited period, for security and abuse prevention.

## Service providers

We use providers to run Provd. They process data on our behalf, only as needed to provide their service:
- **Hosting and infrastructure:** servers, databases and network security.
- **Payments:** Paystack (card and M-Pesa).
- **Blockchain data:** TronGrid and Solana RPC providers, which receive the wallet addresses we look up.
- **Token data:** GoPlus Security, for token contracts on ramp checks.
- **Timestamps:** OpenTimestamps calendar servers, which receive only combined hashes.
- **Error monitoring:** configured not to collect personal data.

Some providers may process data outside Kenya. Where they do, we use providers that protect it appropriately.

## Your rights

You can ask to access, correct or delete the personal data we hold about you, or object to how we use it, by writing to [hello@provd.tech](mailto:hello@provd.tech). If you are in Kenya, you can also complain to the Office of the Data Protection Commissioner; elsewhere, to your local data protection authority.

## Changes

We will update this page when our practices change and revise the date above.
`;

export default function PrivacyPolicyPage() {
  return <LegalPage title="Privacy Policy" content={content} />;
}
