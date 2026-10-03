import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Data Processing — Provd",
  description: "How Provd processes data, and data processing terms for customers.",
};

const content = `
## What Provd processes

Provd scores transactions that API customers send us before they release funds. Customers send counterparty wallet addresses (public blockchain data), rails and amounts, and may send **hashed** phone identifiers (HMAC or SHA-256). We do not accept raw phone numbers.

Outcomes a customer reports, such as reversals or confirmed fraud, are processed on that customer's behalf and used only for that customer's checks. They are never pooled across customers.

We also handle account and contact details and technical logs. See the [Privacy Policy](/privacy-policy) for details.

## Data processing agreements

Customers who need a data processing agreement (DPA) can request one. It covers the identifiers and outcomes we process on their behalf, security measures, sub-processors and deletion on termination.

## Security

We protect the data we hold with access controls, encryption in transit and least-privilege access for staff and providers.

## Contact

DPA requests and questions: [hello@provd.tech](mailto:hello@provd.tech).
`;

export default function DataProcessingPage() {
  return <LegalPage title="Data Processing" content={content} />;
}
