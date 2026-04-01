import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import Markdown from "@/components/ui/markdown";

export const metadata = {
  title: "Privacy Policy — Provd",
};

export default function PrivacyPolicyPage() {
  return (
    <Section className="pt-14 pb-16" padded={false}>
      <Container size="default">
        <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Legal</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-5">Privacy Policy</h1>
           <Markdown>{[
            '# Privacy Policy',
            '',
            '**Provd Technologies Ltd.**',
            '**Effective date:** 1 April 2026',
            '**Last updated:** 1 April 2026',
            '',
            '---',
            '',
            '## 1. Introduction',
            '',
            'Provd Technologies Ltd. ("Provd", "we", "us", or "our") operates the fraud intelligence platform accessible at provd.io and via the Provd API. This Privacy Policy explains how we collect, use, process, and protect personal data in connection with our services.',
            '',
            'We are registered in Kenya and operate under the Kenya Data Protection Act 2019 (DPA), the Data Protection (General) Regulations 2021, and equivalent legislation in the jurisdictions in which our clients operate, including the Nigeria Data Protection Regulation (NDPR) 2019 and the South Africa Protection of Personal Information Act 2013 (POPIA).',
            '',
            'We have appointed a Data Protection Officer. Contact: dpo@provd.io.',
            '',
            '---',
            '',
            '## 2. Data we process',
            '',
            '### 2.1 Data about our clients (exchanges, wallets, and platform operators)',
            '',
            'When an organisation signs up for Provd, we collect:',
            '',
            '- Organisation name, registration details, and country of incorporation',
            '- Contact details of the account administrator (name, email address, job title)',
            '- Billing information (processed via our payment provider; we do not store card numbers)',
            '- API usage logs: endpoint called, timestamp, response code, latency, and the `request_id` associated with each call',
            '',
            'We do not store the payload content of API requests beyond what is necessary for fraud intelligence purposes as described in Section 2.2.',
            '',
            '**Legal basis:** Performance of a contract (DPA, Section 30(1)(b)); legitimate interests in maintaining accurate records and providing support (DPA, Section 30(1)(f)).',
            '',
            '### 2.2 Intelligence data processed on behalf of our clients',
            '',
            "Provd's core function is to process anonymised risk signals submitted by exchange partners. This data is processed to generate fraud intelligence that benefits all participants in the federated network.",
            '',
            '**What we receive from partners:**',
            '',
            '- Hashed identifiers (SHA-256 commitments of wallet addresses, phone numbers, and bank account numbers — never the underlying values)',
            '- Outcome labels (e.g. `confirmed_fraud`, `dispute_resolved_against_party`) associated with hashed identifiers',
            '- Timestamp and chain identifier',
            '',
            '**What we do not receive:**',
            '',
            '**Provd as data processor:** When processing intelligence data submitted by exchange partners, Provd acts as a data processor under the instructions of the partner (the data controller). Our Data Processing Agreement (DPA) governs this relationship and is available at provd.io/legal/data-processing.',
            '',
            "**Legal basis (as processor):** Compliance with the client's data processing instructions as set out in the Data Processing Agreement.",
            '',
            '### 2.3 On-chain public data',
            '',
            "We access publicly available blockchain data from BNB Chain, Tron, Celo, Polygon, and Ethereum to compute on-chain behavioral features for wallet addresses submitted in API queries. This data is public by nature of the blockchain's design.",
            '',
            '### 2.4 Website and marketing data',
            '',
            'When you visit provd.io, we collect standard server logs (IP address, browser, pages visited, referrer) and, where you have consented, analytics data. See our Cookie Policy for details.',
          ].join('\n')}</Markdown>
      </Container>
    </Section>
  );
}

