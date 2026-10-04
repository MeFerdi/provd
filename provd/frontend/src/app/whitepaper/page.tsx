import { LegacyRedirect } from "@/components/shell/LegacyRedirect";
import { docsUrl } from "@/lib/sites";

export const metadata = { robots: { index: false } };

export default function LegacyRedirectPage() {
  return <LegacyRedirect to={docsUrl()} label="Read the docs" />;
}
