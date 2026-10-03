import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Terms of Service — Provd",
  description: "Terms for using the Provd website, ratings, scanner and API.",
};

const content = `
## The service

Provd provides ratings, findings, research and a contract scanner describing the security configuration of cross-chain protocols, built from public on-chain data ("the Service"). By using the Service you agree to these terms.

## Not advice, not a guarantee

Ratings describe configuration, not code. They are not an audit, not a guarantee that a protocol is safe, and not investment, legal or financial advice. A good grade does not mean a protocol cannot be exploited; a poor grade does not mean it will be. You are responsible for your own decisions.

## Accuracy

We work to make every finding accurate and link it to its on-chain source, but data can be incomplete, delayed or wrong (for example, operator names come from third-party registries, and we currently read only Ethereum-side configuration). If you believe a rating is wrong, contact [security@provd.tech](mailto:security@provd.tech) and we will review it.

## Acceptable use

Do not abuse the Service: no attempts to disrupt it, bypass rate limits, scrape it in a way that degrades it for others, or use it to break the law. We may limit or suspend access that does.

## Use of ratings

You may quote and link to public ratings and research with attribution to Provd. Do not present our ratings in a misleading way or imply that Provd endorses a protocol.

## Early access

Features offered in early access may change or be withdrawn. Separate terms may apply to paid plans once they are available.

## Liability

The Service is provided "as is". To the maximum extent permitted by law, Provd is not liable for any loss arising from use of, or reliance on, the Service.

## Changes and contact

We may update these terms; the date above shows the latest version. Questions: [hello@provd.tech](mailto:hello@provd.tech).
`;

export default function TermsPage() {
  return <LegalPage title="Terms of Service" content={content} />;
}
