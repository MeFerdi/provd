import type { Metadata } from "next";

import ContactSection from "@/components/marketing/ContactSection";

export const metadata: Metadata = {
  title: "Get an API key — Provd",
  description: "Talk to us about wiring Provd risk checks into your P2P desk, ramp or payout flow.",
  alternates: { canonical: "/early-access" },
};

export default function EarlyAccessPage() {
  return (
    <main className="bg-white pt-16">
      <ContactSection id="talk-to-us" asPageTitle />
    </main>
  );
}
