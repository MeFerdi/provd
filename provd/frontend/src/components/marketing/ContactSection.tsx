import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/env";

const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Provd API key")}&body=${encodeURIComponent(
  "Platform:\nWhat you settle (P2P, ramp, payouts):\nRough monthly volume:\n"
)}`;

export default function ContactSection({ id = "contact", asPageTitle = false }: { id?: string; asPageTitle?: boolean }) {
  const Heading = asPageTitle ? "h1" : "h2";
  return (
    <section id={id} className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
        <div className="min-w-0">
          <Heading className="mb-5 font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
            Get an API key.
          </Heading>
          <p className="text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
            Tell us what your platform settles and roughly how much. We&apos;ll send a key and help you wire the first
            check into your release flow.
          </p>
        </div>
        <div className="min-w-0 rounded-md border border-bg-border bg-white p-6">
          <p className="text-sm text-text-secondary">Email us</p>
          <a href={MAILTO} className="mt-1 block break-all font-sans text-xl font-medium text-text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={MAILTO}
              className="inline-flex h-12 items-center justify-center rounded-md border border-accent-primary bg-accent-primary px-6 font-sans text-base font-medium text-white transition-colors hover:border-[#333333] hover:bg-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary focus-visible:ring-offset-2"
            >
              Talk to us
            </a>
            <Button href="/check" size="lg" variant="secondary">
              Try the free check
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
