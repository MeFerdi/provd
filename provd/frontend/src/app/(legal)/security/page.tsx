import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Security | Provd",
  description: "How Provd protects customer data and keys, and how to report a vulnerability.",
  alternates: { canonical: "/security" },
};

const content = `
## How we protect the service

- **Access:** API keys are random 256-bit values, stored only as hashes and shown once. Every key carries explicit permissions; admin operations are separate and not part of the public API.
- **Abuse protection:** rate limits on every endpoint, throttling of failed sign-ins and invalid keys, request size limits, and strict validation of everything you send.
- **Transport:** HTTPS only, a host allow-list and strict security headers. The website loads no third-party scripts.
- **Your data:** phone identifiers are accepted only as hashes. Outcomes you report shape your own checks only and are never pooled across customers. See the [Privacy Policy](/privacy-policy) and [Data Processing](/data-processing).
- **Signed decisions:** every decision is signed and its fingerprint is timestamped on Bitcoin, so tampering is detectable by anyone. [Verify a decision](/verify) yourself.
- **Release attestations:** signed with a key separate from decision records, issued only for release decisions, bound to one escrow contract, amount, recipient and expiry, and recorded.
- **Keys and secrets:** signing keys and credentials are kept out of code and images, in the hosting provider's secret store. The service refuses to start in production without them.

## Report a vulnerability

Email [security@provd.tech](mailto:security@provd.tech) with what you found, how to reproduce it and its impact. We'll acknowledge your report, keep you updated while we fix it, and credit you if you'd like.

**In scope:** provd.tech, api.provd.tech, the Provd API, decision records and release attestations, and the published verifier contracts.

**Please:**
- test only with your own account and API keys, and never access, change or delete other customers' data;
- don't run denial-of-service tests, spam, or social engineering of our team or customers;
- give us reasonable time to fix an issue before disclosing it publicly.

We won't take legal action against good-faith research that follows these rules.

Our contact details are also published in [/.well-known/security.txt](/.well-known/security.txt).
`;

export default function SecurityPage() {
  return <LegalPage title="Security" content={content} />;
}
