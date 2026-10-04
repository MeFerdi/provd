import type { Metadata } from "next";
import Link from "next/link";

import { LookalikePanel } from "@/components/check/LookalikePanel";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/env";
import { docsUrl } from "@/lib/sites";

const PATH = "/address-poisoning-check";

export const metadata: Metadata = {
  title: "Address poisoning check: is this the address you meant? (Tron, Solana) | Provd",
  description:
    "Free address poisoning check for USDT and USDC on Tron and Solana. Paste the address you're about to pay and the ones you've paid before: Provd flags lookalike addresses and dust-sending bots before you send. No sign-up.",
  alternates: { canonical: PATH },
};

const STEPS = [
  {
    title: "You make a real payment",
    text: "You send stablecoins to someone you pay often: a supplier, a buyer, your own exchange account.",
  },
  {
    title: "A bot copies the address",
    text: "Within minutes, a bot creates an address with the same first and last characters as your payee's, and sends you a tiny amount (dust) from it. Now the copy sits in your history, next to the real one.",
  },
  {
    title: "You copy the wrong one",
    text: "Next time you pay, you copy the address from your history. Wallets shorten addresses to their first and last characters, so the copy looks identical. The funds go to the scammer, and on-chain there is no undo.",
  },
];

const RESULTS = [
  {
    verdict: "Don't send: this is a lookalike",
    meaning:
      "The address starts and ends like one you've paid, but it's a different address. Real addresses almost never match like this by chance: matching 4 leading and 4 trailing characters happens about once in 130 trillion random addresses.",
  },
  {
    verdict: "Careful: this address behaves like a poisoning bot",
    meaning:
      "It doesn't match your list, but its own history looks like a poisoning bot: it sends tiny amounts to many wallets and has never received real value.",
  },
  {
    verdict: "No lookalike found",
    meaning:
      "It doesn't imitate any address you pasted, and it doesn't behave like a poisoning bot. Still compare the full address with the person you're paying, character by character.",
  },
];

const FAQ = [
  {
    q: "What is address poisoning?",
    a: "A scam where an attacker creates a wallet address that starts and ends like one you've paid, then sends you a tiny transfer from it so it appears in your transaction history. If you later copy that address instead of the real one, you send your funds to the attacker. It's also called a lookalike address, zero-value transfer or dust attack.",
  },
  {
    q: "Is the address poisoning check free?",
    a: "Yes. It's free and needs no account. It's rate-limited to keep it available for everyone.",
  },
  {
    q: "Does Provd store the addresses I paste?",
    a: "No. The list of addresses you've paid is used for that one check and isn't stored. Provd reads only public blockchain data about the address you're checking.",
  },
  {
    q: "Which blockchains and tokens does it cover?",
    a: "Tron (USDT) and Solana (USDC and USDT). Solana addresses are detected automatically; Tron addresses start with T.",
  },
  {
    q: "I received a tiny transfer from an address that looks like my payee's. What should I do?",
    a: "Nothing with the funds: don't send anything back. Delete or ignore that entry, and from now on copy addresses from a saved address book or from the person you're paying, never from your transaction history. Check any address you're unsure of here before sending.",
  },
  {
    q: "I already sent funds to a lookalike address. Can I get them back?",
    a: "Usually not: blockchain transfers can't be reversed. Act quickly anyway: report the address to the exchange or wallet you used, and for USDT or USDC contact the issuer (Tether or Circle), which can sometimes freeze funds still sitting in the scammer's wallet. Report the theft to your local police as well.",
  },
  {
    q: "Can platforms run this check automatically?",
    a: "Yes. Every Provd API check includes it: send the destination with your list of known payees (or let Provd learn them from your past payouts), and a lookalike comes back as a LOOKALIKE_DESTINATION flag before you release the payment.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Provd address poisoning check",
      url: `${SITE_URL}${PATH}`,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Any (web browser)",
      description: "Checks whether a Tron or Solana address imitates one you've paid before, or behaves like an address-poisoning bot.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};

const h2 = "mb-4 scroll-mt-28 font-display text-[28px] leading-tight text-text-primary md:text-[34px]";
const body = "text-[16px] leading-relaxed text-text-secondary";

export default function AddressPoisoningCheckPage() {
  return (
    <main className="bg-white pb-20 pt-28">
      <JsonLd data={structuredData} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="mb-4 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">Address poisoning check.</h1>
        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-text-secondary">
          Before you send USDT or USDC on Tron or Solana, check that the address is the one you meant and not a lookalike
          planted in your history. Free, no sign-up.
        </p>

        <LookalikePanel />

        <section aria-labelledby="how" className="mt-16">
          <h2 id="how" className={h2}>
            How address poisoning works
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-md border border-bg-border p-5">
                <div className="font-mono text-xs text-text-muted">0{i + 1}</div>
                <div className="mt-1 font-sans text-base font-semibold text-text-primary">{step.title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="how-often" className="mt-16">
          <h2 id="how-often" className={h2}>
            How often it happens
          </h2>
          <p className={body}>
            In October 2026 we followed 147 randomly chosen active Solana wallets that had just made a USDC or USDT payment
            of $10 or more, by hand.
          </p>
          <dl className="mt-6 grid gap-px overflow-hidden rounded-md border border-bg-border bg-bg-border sm:grid-cols-3">
            <div className="bg-white p-5">
              <dt className="text-sm text-text-muted">Targeted within a day</dt>
              <dd className="mt-1 font-display text-3xl text-text-primary">13.6%</dd>
              <dd className="mt-1 text-sm text-text-secondary">20 of 147 wallets (95% range 9% to 20%)</dd>
            </div>
            <div className="bg-white p-5">
              <dt className="text-sm text-text-muted">Time from payment to the first dust</dt>
              <dd className="mt-1 font-display text-3xl text-text-primary">5 min</dd>
              <dd className="mt-1 text-sm text-text-secondary">median; often within 6 seconds</dd>
            </div>
            <div className="bg-white p-5">
              <dt className="text-sm text-text-muted">Characters copied</dt>
              <dd className="mt-1 font-display text-3xl text-text-primary">4 + 4</dd>
              <dd className="mt-1 text-sm text-text-secondary">the first and last four, what wallets show</dd>
            </div>
          </dl>
          <p className={`mt-6 ${body}`}>
            In 19 of the 20 cases the lookalike imitated someone the wallet had just paid. Exchange payout wallets, which
            never copy addresses by hand, weren&apos;t targeted at all. The scam aims at people and teams who pay by copying
            and pasting. We measured how often wallets are targeted, not how much is lost: a lookalike waits for a later
            payment, which a one-day window can&apos;t see.
          </p>
        </section>

        <section aria-labelledby="results" className="mt-16">
          <h2 id="results" className={h2}>
            What the result means
          </h2>
          <div className="divide-y divide-bg-border rounded-md border border-bg-border">
            {RESULTS.map((r) => (
              <div key={r.verdict} className="p-5">
                <div className="font-sans text-base font-semibold text-text-primary">{r.verdict}</div>
                <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{r.meaning}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="protect" className="mt-16">
          <h2 id="protect" className={h2}>
            How to protect yourself
          </h2>
          <ul className={`list-disc space-y-2 pl-5 ${body}`}>
            <li>Never copy an address from your transaction history. Use a saved address book, or get it from the person you&apos;re paying.</li>
            <li>Compare the whole address, not just the first and last characters your wallet shows.</li>
            <li>Ignore tiny incoming transfers from addresses you don&apos;t know, and never send funds back to them.</li>
            <li>For a large payment, send a small test amount first and confirm it arrived.</li>
            <li>Check the address here before you send: it compares it against the ones you&apos;ve paid.</li>
          </ul>
        </section>

        <section aria-labelledby="platforms" className="mt-16 rounded-md border border-bg-border bg-bg-surface p-6">
          <h2 id="platforms" className="font-sans text-xl font-semibold text-text-primary">
            For exchanges, payout platforms and P2P desks
          </h2>
          <p className={`mt-2 ${body}`}>
            Run this check on every withdrawal and payout. Each Provd check compares the destination with the addresses your
            platform has paid before, and flags lookalikes and dust-sending bots before the funds leave, alongside sanctions
            and frozen-wallet screening.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
            <a href={docsUrl("/quickstart")} className="text-accent-secondary hover:underline">
              Read the quickstart →
            </a>
            <Link href="/check" className="text-accent-secondary hover:underline">
              Full wallet risk check →
            </Link>
            <Link href="/early-access" className="text-accent-secondary hover:underline">
              Get an API key →
            </Link>
          </div>
        </section>

        <section aria-labelledby="faq" className="mt-16">
          <h2 id="faq" className={h2}>
            Questions
          </h2>
          <div className="divide-y divide-bg-border border-y border-bg-border">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-sans text-base font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden="true" className="shrink-0 font-mono text-lg leading-6 text-text-muted group-open:hidden">
                    +
                  </span>
                  <span aria-hidden="true" className="hidden shrink-0 font-mono text-lg leading-6 text-text-muted group-open:inline">
                    −
                  </span>
                </summary>
                <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
