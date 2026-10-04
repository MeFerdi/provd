import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Terms of Service | Provd",
  description: "Terms for using the Provd website, counterparty scanner and API.",
  alternates: { canonical: "/terms" },
};

const content = `
## The service

Provd provides risk checks before stablecoin payments are released: scores, explanations, signed decision records, release attestations for escrow contracts, and free public counterparty and lookalike checks, for P2P trades, on- and off-ramps, payouts and escrows ("the Service"). By using the Service you agree to these terms.

## Not advice, not a guarantee

Scores are risk signals to support your own decision. They are not a guarantee that a transaction is safe, and not investment, legal or financial advice. A low score does not mean a counterparty is honest; a high score does not mean it is fraudulent. You are responsible for your own decisions, including whether to release funds.

## Sanctions and risk lists

We screen against public lists, including the US Treasury OFAC sanctions list and addresses frozen by stablecoin issuers. A match is a strong risk signal for your own compliance process. It is not a legal determination, and our screening is not a substitute for your own compliance programme (such as KYC, other sanctions lists, Travel Rule or suspicious-activity reporting). Lists change, and we refresh them periodically, so a very recent change may not be reflected yet.

## Lookalike addresses

The lookalike check compares an address with the addresses you or your platform have used. It helps catch address-poisoning scams but can't catch every one: always check the full address before sending.

## Release attestations and contracts

A release attestation is our signed recommendation to release a specific amount to a specific wallet, for a specific escrow contract, until it expires. You are responsible for your contracts, including verifying attestations correctly, checking expiry and preventing reuse. Example contracts we publish are illustrations, not audited code; have any contract you deploy independently audited. If you believe our attestation key has been compromised, tell us immediately at [security@provd.tech](mailto:security@provd.tech) so we can rotate it, and update the signer in your contracts.

## What you send us

You are responsible for having the right to send us the data in your checks, including address books and account signals from your own providers. Send phone identifiers only as hashes.

## Accuracy

We work to make every score accurate and explain the signals behind it, but data can be incomplete, delayed or wrong (for example, public risk lists change, and for busy wallets we read only recent transfers). If you believe a score is wrong, contact [hello@provd.tech](mailto:hello@provd.tech) and we will review it.

## Acceptable use

Do not abuse the Service: no attempts to disrupt it, bypass rate limits, scrape it in a way that degrades it for others, or use it to break the law. We may limit or suspend access that does.

## Use of scores

Do not present our scores in a misleading way, or as a finding that a person committed fraud.

## Early access and payment

Features offered in early access, including prices, may change or be withdrawn. Prepaid checks are used as checks are scored; checks we can't score yet (marked "not yet supported") aren't charged. Card and M-Pesa payments are processed by Paystack under its own terms. The free public checks are rate-limited.

## Liability

The Service is provided "as is". To the maximum extent permitted by law, Provd is not liable for any loss arising from use of, or reliance on, the Service.

## Changes and contact

We may update these terms; the date above shows the latest version. Questions: [hello@provd.tech](mailto:hello@provd.tech).
`;

export default function TermsPage() {
  return <LegalPage title="Terms of Service" content={content} />;
}
