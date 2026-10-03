import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Data Processing — Provd",
  description: "How Provd processes data, and data processing terms for customers.",
};

const content = `
## What Provd processes

Provd's ratings and monitoring are built from **public blockchain data**: contract configuration, verifier sets, and the accounts that can change them. We do not need customers to send us personal data to use the Service.

The personal data we do handle is limited to account and contact details (for example, the email address used to request early access) and technical logs. See the [Privacy Policy](/privacy-policy) for details.

## Customers on paid plans

When paid plans become available, customers who need a data processing agreement (DPA) can request one. It will cover the contact and account data we process on their behalf, security measures, sub-processors and deletion on termination.

## Security

We protect the data we hold with access controls, encryption in transit and least-privilege access for staff and providers.

## Contact

DPA requests and questions: [hello@provd.tech](mailto:hello@provd.tech).
`;

export default function DataProcessingPage() {
  return <LegalPage title="Data Processing" content={content} />;
}
