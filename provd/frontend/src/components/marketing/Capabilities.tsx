import Link from "next/link";
import { docsUrl } from "@/lib/sites";

type Capability = { title: string; body: string; link?: { href: string; label: string }; wide?: boolean };

const CAPABILITIES: Capability[] = [
  {
    title: "Pre-release scoring",
    body: "Score a transaction before funds move, with a signal-by-signal explanation of what raised or lowered the risk.",
  },
  {
    title: "Counterparty and sanctions checks",
    body: "Each wallet, on Tron or Solana, is checked against the US Treasury (OFAC) sanctions list and the addresses Tether and Circle have frozen, and against the wallets it has traded with.",
  },
  {
    title: "Lookalike-address protection",
    body: "Flags payouts to addresses that imitate one you've paid (address poisoning) and addresses that only send dust. Free to try on any address.",
    link: { href: "/check#lookalike", label: "Try the lookalike check" },
  },
  {
    title: "Your history counts",
    body: "Report reversals and confirmed fraud, and future checks learn from them. Your data stays yours and is never pooled with other platforms.",
  },
  {
    title: "Decision records",
    body: "Every check is hashed, signed and timestamped on Bitcoin, so you can prove to an auditor or regulator what was checked and when, without having to trust us.",
    link: { href: "/verify", label: "Verify a decision" },
  },
  {
    title: "Release attestations",
    body: "For non-custodial escrows: a signed release your contract verifies on-chain before paying out, on Tron and Solana.",
    link: { href: docsUrl("/non-custodial"), label: "Escrow integration" },
  },
  {
    title: "Pay as you go",
    body: "Buy checks like airtime: pay by card or USDT from anywhere, or M-Pesa in Kenya. 300 free checks a month, bundles from $20, and monthly plans for payout platforms. Attestations and the public checks are free.",
    link: { href: "/pricing", label: "See pricing" },
    wide: true,
  },
];

const RAILS = [
  { label: "USDT on Tron", status: "Live" },
  { label: "USDC and USDT on Solana", status: "Live" },
  { label: "Any local rail (M-Pesa, Pix, UPI, bank)", status: "Fiat context" },
  { label: "EVM chains", status: "Next" },
];

export default function Capabilities() {
  return (
    <section className="border-b border-bg-border bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-10 max-w-2xl font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
          What you get.
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ title, body, link, wide }) => (
            <div key={title} className={`rounded-md border border-bg-border bg-white p-6 ${wide ? "lg:col-span-2" : ""}`}>
              <h3 className="font-sans text-lg font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{body}</p>
              {link ? (
                <Link href={link.href} className="mt-3 inline-block text-[15px] text-accent-secondary hover:underline">
                  {link.label} →
                </Link>
              ) : null}
            </div>
          ))}
          <div className="rounded-md border border-bg-border bg-bg-surface p-6">
            <h3 className="font-sans text-lg font-semibold text-text-primary">Rails</h3>
            <ul className="mt-3 divide-y divide-bg-border">
              {RAILS.map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-3 py-2 text-[15px]">
                  <span className="text-text-primary">{r.label}</span>
                  <span className={r.status === "Live" ? "text-sm font-medium text-grade-a" : "text-sm text-text-muted"}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Agent-ready API: the same intents work for automated agents.
            </p>
          </div>
        </div>

        <p className="mt-10 max-w-3xl border-l-2 border-text-primary pl-5 text-[16px] leading-relaxed text-text-primary sm:text-[17px]">
          Device identity is not our layer; we work alongside device-trust providers. We decide whether to release the
          funds.
        </p>
      </div>
    </section>
  );
}
