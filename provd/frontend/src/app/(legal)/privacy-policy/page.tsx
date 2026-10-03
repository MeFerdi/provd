import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Privacy Policy — Provd",
  description: "What personal data Provd collects, why, and your rights.",
};

const content = `
## Who we are

Provd Technologies Ltd. ("Provd", "we") operates provd.tech and the Provd API. Provd rates the security configuration of cross-chain protocols using public blockchain data. Contact: [hello@provd.tech](mailto:hello@provd.tech).

## What we collect

**Early-access requests.** When you submit the early-access form we collect your email address, and optionally your organization, role and message. We use this only to contact you about Provd access and to understand what you want to monitor.

**Contract scans.** When you scan a contract we receive the contract address and chain. Contract addresses and on-chain configuration are public data. We may keep scan results to improve coverage.

**Technical logs.** Our servers and hosting provider record standard request data (IP address, user agent, requested URL, time). We use it to operate the service, prevent abuse and enforce rate limits.

**Browser storage.** The website stores your light/dark theme choice in your browser's local storage. It is never sent to us.

We do not use advertising trackers and we do not sell or share personal data for marketing.

## Public blockchain data

Ratings, findings and research are built from public on-chain data, such as contract configuration and the addresses of accounts that control it. Those addresses may belong to individuals. We publish them only as part of describing a protocol's security configuration.

## How long we keep it

Early-access details are kept until you ask us to delete them or we no longer need them to contact you. Technical logs are kept for a limited period for security and abuse prevention.

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
