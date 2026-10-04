import HeroMascot from "@/components/marketing/HeroMascot";
import { Button } from "@/components/ui/button";
import { FREE_MONTHLY_CHECKS } from "@/lib/pricing";
import { docsUrl } from "@/lib/sites";

export default function Hero() {
  return (
    <section className="border-b border-bg-border bg-white pt-28 lg:pt-24">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
        <div className="min-w-0 max-w-2xl lg:py-16">
          <h1 className="mb-6 font-display text-[40px] leading-[1.05] text-text-primary sm:text-[52px] lg:text-[60px]">
            Catch the bad payment before the stablecoins leave.
          </h1>
          <p className="max-w-xl font-sans text-[17px] leading-[1.7] text-text-secondary sm:text-[18px]">
            Provd checks P2P trades, payouts and escrow releases for sanctioned or frozen wallets, lookalike addresses
            and your own fraud history, in one API call. Every answer comes with its reasons and a signed record.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/check" size="lg">
              Run a free counterparty check
            </Button>
            <Button href={docsUrl("/quickstart")} size="lg" variant="secondary">
              Read the quickstart
            </Button>
          </div>
          <p className="mt-4 font-sans text-sm text-text-secondary">
            {FREE_MONTHLY_CHECKS} free checks a month, then pay as you go.
          </p>
          <p className="mt-2 font-sans text-sm text-text-muted">Live today: USDT on Tron, USDC and USDT on Solana, alongside M-Pesa, Pix, UPI, bank transfer or any local rail.</p>
        </div>
        <figure className="w-full min-w-0 max-w-[440px] justify-self-center pb-14 lg:justify-self-end lg:py-12">
          <HeroMascot />
          <figcaption className="sr-only">A smiling scoresheet carrying a Tether coin: the payment was scored before release.</figcaption>
        </figure>
      </div>
    </section>
  );
}
