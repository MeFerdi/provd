import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Data Processing | Provd",
  description: "How Provd processes data, and data processing terms for customers.",
};

const content = `
## What Provd processes for customers

Customers send us the payments they want checked before release: counterparty wallet addresses (public blockchain data), rails and amounts, and optionally:
- **hashed** phone identifiers (HMAC or SHA-256); we reject raw phone numbers;
- address books of wallets they have paid, used to catch lookalike addresses;
- account-takeover signals from their own providers, such as the time of a SIM swap;
- their own reference data.

Outcomes a customer reports, such as reversals or confirmed fraud, are processed on that customer's behalf and used only for that customer's checks. They are never pooled across customers. Decision records and release attestations are kept for the customer's audit needs and deleted on request; only combined hashes are timestamped on Bitcoin.

We also handle account details, payment records and technical logs. See the [Privacy Policy](/privacy-policy).

## Sub-processors

| Provider | Purpose | Data |
|---|---|---|
| Hosting and infrastructure provider | Servers, database, network security | All service data, encrypted in transit |
| Paystack | Card and M-Pesa payments | Receipt email, amount, payment reference |
| TronGrid; Solana RPC providers | Blockchain data | Wallet addresses being checked |
| GoPlus Security | Token contract checks on ramp intents | Token contract addresses |
| OpenTimestamps calendars | Bitcoin timestamps | Combined hashes only |
| Error monitoring | Diagnosing failures | Technical error details, configured without personal data |

We'll update this list before adding a sub-processor that receives customer data.

## Security measures

- API keys are stored only as hashes; admin and customer access are separated by scope.
- Encryption in transit (HTTPS only); the database isn't reachable from the internet.
- Rate limits and brute-force protection on every endpoint; strict input limits.
- Every decision is signed, and every release attestation is signed with a separate key and recorded.
- Least-privilege access for staff and providers; secrets kept in the hosting provider's secret store.

More detail: [Security](/security).

## Data processing agreements

Customers who need a data processing agreement (DPA) can request one. It covers the identifiers and outcomes we process on their behalf, security measures, sub-processors and deletion on termination.

## Contact

DPA requests and questions: [hello@provd.tech](mailto:hello@provd.tech).
`;

export default function DataProcessingPage() {
  return <LegalPage title="Data Processing" content={content} />;
}
