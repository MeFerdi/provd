import { Button } from "@/components/ui/button";
import { FREE_DAILY_CHECKS } from "@/lib/pricing";

export default function Hero() {
  return (
    <section className="border-b border-bg-border bg-white pt-28 lg:pt-24">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center">
        <div className="min-w-0 max-w-2xl lg:py-16">
          <h1 className="mb-6 font-display text-[40px] leading-[1.05] text-text-primary sm:text-[52px] lg:text-[60px]">
            Score African money movement before it&apos;s released.
          </h1>
          <p className="max-w-xl font-sans text-[17px] leading-[1.7] text-text-secondary sm:text-[18px]">
            Risk checks for P2P stablecoin trades and mobile-money ramps. Every decision explained, every check on
            record. Pay as you go — {FREE_DAILY_CHECKS} free checks a day.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/check" size="lg">
              Run a free counterparty check
            </Button>
            <Button href="/docs/quickstart" size="lg" variant="secondary">
              Read the quickstart
            </Button>
          </div>
          <p className="mt-5 font-sans text-sm text-text-muted">Live today: USDT on Tron.</p>
        </div>
        <div className="flex min-w-0 justify-center lg:justify-end lg:self-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cyber-investigation-specialist-working-governmental-hacking-room-removebg-preview.png"
            alt="Risk analyst reviewing a transaction"
            width={408}
            height={612}
            fetchPriority="high"
            className="pointer-events-none -mt-20 block h-auto w-full max-w-[260px] sm:-mt-24 sm:max-w-[320px] lg:mt-0 lg:max-w-[408px]"
          />
        </div>
      </div>
    </section>
  );
}
