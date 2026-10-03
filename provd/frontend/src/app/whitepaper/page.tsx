import { LegacyRedirect } from "@/components/shell/LegacyRedirect";

export const metadata = { robots: { index: false } };

export default function LegacyRedirectPage() {
  return <LegacyRedirect to="/docs" label="Read the docs" />;
}
