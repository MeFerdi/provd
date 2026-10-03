import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Privacy Policy — Provd",
  description: "What personal data Provd collects, why, and your rights.",
};

const content = `
## Who we are

Provd Technologies Ltd. ("Provd", "we") operates provd.tech and the Provd API. Provd scores P2P stablecoin trades and mobile-money ramp transactions for risk before funds are released. Contact: [hello@provd.tech](mailto:hello@provd.tech).

## What we collect

**Account and contact details.** When you email us or get an API key we keep your name, work email and organization. We use them to run your account and contact you about Provd.

**API customers' data.** Platforms send us details of the trades they want scored: counterparty wallet addresses, rails, amounts and, optionally, a phone identifier. Phone identifiers must be sent as hashes (HMAC or SHA-256); we do not accept raw phone numbers. Outcomes a platform reports (for example a reversal) are used only for that platform's own checks and are never pooled with other customers.

**Counterparty checks.** When you use the public scanner we receive the wallet address you check. Wallet addresses and their transfers are public blockchain data.

**Technical logs.** Our servers and hosting provider record standard request data (IP address, user agent, requested URL, time). We use it to operate the service, prevent abuse and enforce rate limits.

**Browser storage.** The website stores your light/dark theme choice in your browser's local storage. It is never sent to us.

We do not use advertising trackers and we do not sell or share personal data for marketing.

## Public blockchain data

Scores are built partly from public on-chain data, such as a wallet's transfers and public risk lists (for example, addresses Tether has frozen). Wallet addresses may belong to individuals. We show them only as part of explaining a risk check.

## How long we keep it

Account details are kept while your account is active and until you ask us to delete them. Decision records are kept so customers can verify past checks for audit. Technical logs are kept for a limited period for security and abuse prevention.

## Service providers

We use hosting, infrastructure and email providers to run Provd. They process data on our behalf and only as needed to provide their services.

## Your rights

You can ask to access, correct or delete the personal data we hold about you, or object to its use, by writing to [hello@provd.tech](mailto:hello@provd.tech). Depending on where you live you may also have the right to complain to a data protection authority.

## Changes

We will update this page when our practices change and revise the date above.
`;

export default function PrivacyPolicyPage() {
  return <LegalPage title="Privacy Policy" content={content} />;
}
