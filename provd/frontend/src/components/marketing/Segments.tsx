import Link from "next/link";

type Segment = { title: string; pain: string; provd: string; link?: { href: string; label: string } };

const SEGMENTS: Segment[] = [
  {
    title: "P2P desks and merchants",
    pain: "You release USDT against mobile money or a bank transfer, on thin margins. One reversed payment or tainted counterparty can erase days of profit.",
    provd:
      "Checks every trade above your threshold: tainted wallets (sanctioned or frozen), lookalike addresses, your own reversal history, amounts unusual for your currency, and SIM-swap signals from your provider.",
    link: { href: "/check", label: "Check a wallet free" },
  },
  {
    title: "Non-custodial escrows",
    pain: "Once your contract releases, the funds are gone: no freeze, no clawback, whatever happens next.",
    provd:
      "The check runs before the release. Your arbiter signs only when Provd says release, or your contract verifies a signed Provd release attestation on-chain.",
    link: { href: "/docs/non-custodial", label: "How it fits your escrow" },
  },
  {
    title: "Licensed on- and off-ramps",
    pain: "Your bank partner asks how you screen before you pay out, and the wrong answer can cost you the account.",
    provd:
      "Sanctions (US Treasury OFAC) and issuer-frozen screening before every release, with a signed, Bitcoin-anchored record of each check to show your bank or auditor.",
  },
  {
    title: "Payout platforms",
    pain: "Account takeovers and payouts to the wrong address, at volume.",
    provd: "Lookalike destinations, account-takeover signals, unusual amounts and sanctions, on one call per payout. Monthly plans available.",
    link: { href: "/pricing", label: "See plans" },
  },
];

export default function Segments() {
  return (
    <section className="border-b border-bg-border bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-3 max-w-2xl font-display text-[30px] leading-tight text-text-primary md:text-[42px]">Who it&apos;s for.</h2>
        <p className="mb-10 max-w-2xl text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
          Anyone who sends stablecoins against a payment they can&apos;t take back.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {SEGMENTS.map((s) => (
            <div key={s.title} className="flex flex-col rounded-md border border-bg-border bg-white p-6">
              <h3 className="font-sans text-lg font-semibold text-text-primary">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{s.pain}</p>
              <p className="mt-3 flex-1 border-l-2 border-grade-a pl-3 text-[15px] leading-relaxed text-text-primary">{s.provd}</p>
              {s.link ? (
                <Link href={s.link.href} className="mt-4 inline-block text-[15px] text-accent-secondary hover:underline">
                  {s.link.label} →
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
