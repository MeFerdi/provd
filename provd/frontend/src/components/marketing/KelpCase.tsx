import Link from "next/link";

const FACTS: [string, string][] = [
  ["Exploited route", "Unichain → Ethereum"],
  ["Verifiers on that route", "1 (LayerZero Labs)"],
  ["Set on", "2 April 2025, 381 days before the exploit"],
  ["Routes on a single verifier", "24 of 26"],
  ["Who set it", "A single private key (EOA)"],
  ["The reported downgrade", "21 March 2024, 758 days before"],
];

export default function KelpCase() {
  return (
    <section id="proof" className="border-b border-bg-border bg-bg-surface py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0">
          <p className="mb-3 text-sm text-text-muted">Case study: Kelp DAO, April 2026</p>
          <h2 className="mb-6 font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
            The configuration was public the whole time.
          </h2>
          <p className="text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
            On 2026-04-18 an attacker forged a LayerZero message from Unichain and released 116,500 rsETH (~$292M) from
            Kelp&apos;s rsETH adapter on Ethereum. We rebuilt the adapter&apos;s configuration history from public on-chain
            data.
          </p>
          <p className="mt-5 text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
            The widely reported &ldquo;2-of-2 → 1-of-1 downgrade&rdquo; was real, but it happened on 2024-03-21 — 758 days
            before the exploit, and on other routes. The exploited route was never configured with more than one
            verifier.
          </p>
          <p className="mt-5 text-[16px] leading-relaxed text-text-primary sm:text-[17px]">
            Every one of these settings was public and readable on-chain the whole time. A monitor reading them would
            have flagged the exploited route the day it was opened.
          </p>
          <p className="mt-8">
            <Link href="/blog/kelp-dao-381-days" className="font-sans text-[15px] font-medium text-accent-secondary hover:underline">
              Read the full analysis and method →
            </Link>
          </p>
        </div>

        <div className="min-w-0 rounded-md border border-bg-border bg-white">
          <table className="w-full text-left text-[15px]">
            <caption className="border-b border-bg-border px-5 py-3 text-left text-sm text-text-muted">
              Kelp rsETH adapter on Ethereum, at the time of the exploit
            </caption>
            <tbody className="divide-y divide-bg-border">
              {FACTS.map(([label, value]) => (
                <tr key={label} className="align-top">
                  <th scope="row" className="w-[45%] px-5 py-3.5 font-normal text-text-secondary">
                    {label}
                  </th>
                  <td className="px-5 py-3.5 text-text-primary">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
