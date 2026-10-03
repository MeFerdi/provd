import { Button } from "@/components/ui/button";
import { FREE_MONTHLY_CHECKS } from "@/lib/pricing";

export default function Hero() {
  return (
    <section className="border-b border-bg-border bg-white pt-28 lg:pt-24">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
        <div className="min-w-0 max-w-2xl lg:py-16">
          <h1 className="mb-6 font-display text-[40px] leading-[1.05] text-text-primary sm:text-[52px] lg:text-[60px]">
            Score money movement before it&apos;s released.
          </h1>
          <p className="max-w-xl font-sans text-[17px] leading-[1.7] text-text-secondary sm:text-[18px]">
            Risk checks for P2P stablecoin trades, on- and off-ramps and payouts, wherever local payment rails meet
            stablecoins. Every decision explained, every check on record. Pay as you go, with{" "}
            {FREE_MONTHLY_CHECKS} free checks a month.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/check" size="lg">
              Run a free counterparty check
            </Button>
            <Button href="/docs/quickstart" size="lg" variant="secondary">
              Read the quickstart
            </Button>
          </div>
          <p className="mt-5 font-sans text-sm text-text-muted">Live today: USDT on Tron, alongside M-Pesa, Pix, UPI, bank transfer or any local rail.</p>
        </div>
        <figure className="min-w-0 justify-self-center pb-14 lg:justify-self-end lg:py-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/home/otc-stablecoin-exchange.jpg"
            alt="A street-front over-the-counter exchange with a sign advertising USDT and USDC"
            width={1041}
            height={1200}
            fetchPriority="high"
            className="block h-auto w-full max-w-[460px] rounded-md border border-bg-border object-cover"
          />
          <figcaption className="mt-2 text-xs text-text-muted">
            A stablecoin exchange counter. Photo:{" "}
            <a href="https://commons.wikimedia.org/wiki/File:Over-the-counter-crypto-exchange.jpeg" className="hover:underline">
              Arutoria
            </a>
            ,{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="hover:underline">
              CC BY-SA 4.0
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
