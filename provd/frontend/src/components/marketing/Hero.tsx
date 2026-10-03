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
        <figure className="w-full min-w-0 max-w-[460px] justify-self-center pb-14 lg:justify-self-end lg:py-12">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/home/payment-check-phone-cash.jpg"
              alt="A person checks a payment on her phone while handing over cash"
              width={1120}
              height={1400}
              fetchPriority="high"
              className="block aspect-[4/5] h-auto w-full rounded-md border border-bg-border object-cover"
            />
            {/* Annotations: the check happens on the phone, before the money leaves the hand. */}
            <svg aria-hidden viewBox="0 0 100 125" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <line x1="40" y1="25.5" x2="57" y2="44" stroke="#FFFFFF" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <line x1="22" y1="87.5" x2="41" y2="77" stroke="#FFFFFF" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <span aria-hidden className="absolute left-[57%] top-[35.2%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-warning shadow" />
            <span aria-hidden className="absolute left-[41%] top-[61.6%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-warning shadow" />
            <div className="absolute left-[4%] top-[9%] w-[54%] rounded-md border border-bg-border bg-white/95 px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-text-secondary sm:text-[13px]">
                  Score <span className="font-semibold text-text-primary">540</span>
                </span>
                <span className="rounded border border-accent-warning/40 bg-accent-warning/10 px-1.5 text-[11px] font-semibold text-accent-warning sm:text-[12px]">
                  Hold
                </span>
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-text-secondary sm:text-[12px]">
                Wallet traded with 3 frozen wallets
              </div>
            </div>
            <div className="absolute left-[4%] top-[70%] rounded-md border border-bg-border bg-white/95 px-3 py-1.5 shadow-sm">
              <span className="text-[12px] font-medium text-text-primary sm:text-[13px]">Not released yet</span>
            </div>
          </div>
          <figcaption className="mt-2 text-xs text-text-muted">
            Photo:{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Businesswoman_making_a_payment_with_cash_while_using_a_smartphone_in_a_modern_office_setting.jpg"
              className="hover:underline"
            >
              Shixart1985
            </a>
            ,{" "}
            <a href="https://creativecommons.org/licenses/by/2.0/" className="hover:underline">
              CC BY 2.0
            </a>
            , cropped
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
