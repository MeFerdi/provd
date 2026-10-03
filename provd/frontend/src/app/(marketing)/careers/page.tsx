import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { CONTACT_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Careers | Provd",
  description: "Provd is not hiring yet.",
};

export default function CareersPage() {
  return (
    <Section className="pb-24 pt-28" padded={false}>
      <Container size="default" className="px-4 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="mb-5 font-display text-4xl leading-[1.05] text-text-primary md:text-6xl">We&apos;re not hiring yet.</h1>
          <p className="text-lg text-text-secondary">
            If you work on payments risk, fraud or local payment rails in emerging markets and want to talk, say hello at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-secondary hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </Container>
    </Section>
  );
}
