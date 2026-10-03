import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Terms of Service | Provd",
  description: "Terms for using the Provd website, counterparty scanner and API.",
};

const content = `
## The service

Provd provides risk scores, explanations, decision records and a public counterparty scanner for P2P stablecoin trades, on- and off-ramps and payouts ("the Service"). By using the Service you agree to these terms.

## Not advice, not a guarantee

Scores are risk signals to support your own decision. They are not a guarantee that a transaction is safe, and not investment, legal or financial advice. A low score does not mean a counterparty is honest; a high score does not mean it is fraudulent. You are responsible for your own decisions, including whether to release funds.

## Accuracy

We work to make every score accurate and explain the signals behind it, but data can be incomplete, delayed or wrong (for example, public risk lists change, and for busy wallets we read only recent transfers). If you believe a score is wrong, contact [hello@provd.tech](mailto:hello@provd.tech) and we will review it.

## Acceptable use

Do not abuse the Service: no attempts to disrupt it, bypass rate limits, scrape it in a way that degrades it for others, or use it to break the law. We may limit or suspend access that does.

## Use of scores

Do not present our scores in a misleading way, or as a finding that a person committed fraud.

## Early access and payment

Features offered in early access, including prices, may change or be withdrawn. Prepaid checks are used as checks are scored.

## Liability

The Service is provided "as is". To the maximum extent permitted by law, Provd is not liable for any loss arising from use of, or reliance on, the Service.

## Changes and contact

We may update these terms; the date above shows the latest version. Questions: [hello@provd.tech](mailto:hello@provd.tech).
`;

export default function TermsPage() {
  return <LegalPage title="Terms of Service" content={content} />;
}
