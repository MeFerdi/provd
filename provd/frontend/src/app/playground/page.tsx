import { LegacyRedirect } from "@/components/shell/LegacyRedirect";

export const metadata = { robots: { index: false } };

export default function LegacyRedirectPage() {
  return <LegacyRedirect to="/check" label="Go to the counterparty check" />;
}
