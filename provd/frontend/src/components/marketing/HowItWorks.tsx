const STEPS = [
  {
    title: "Intent",
    icon: "/assets/query.png",
    body: "Send the trade before you release: counterparty wallet, rails and amounts.",
  },
  {
    title: "Evaluate",
    icon: "/assets/rating.png",
    body: "Provd screens the wallet and its counterparties against sanctions and issuer-frozen lists, catches lookalike addresses, and weighs your own history.",
  },
  {
    title: "Decide",
    icon: "/fraud-alert.png",
    body: "A score from 0 to 1000, the reasons, a recommended action (release, manual review, hold or reject) and a signed record. Escrow contracts can verify a release on-chain.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-bg-border bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2 className="mx-auto mb-4 max-w-2xl font-display text-[32px] leading-tight text-text-primary md:text-[44px]">
          One call before every release.
        </h2>
        <p className="mx-auto max-w-2xl text-[16px] leading-relaxed text-text-secondary">
          Intent in, decision out. Every signal that moved the score is listed with its reason.
        </p>
        <ol className="mt-10 flex flex-col divide-y divide-bg-border md:flex-row md:divide-x md:divide-y-0">
          {STEPS.map(({ title, icon, body }) => (
            <li key={title} className="flex-1 px-6 py-10 md:px-8">
              <div className="mb-5 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon} alt="" width={48} height={48} loading="lazy" className="h-12 w-12" />
              </div>
              <h3 className="mb-2 font-sans text-[20px] font-medium text-text-primary">{title}</h3>
              <p className="mx-auto max-w-xs font-sans text-[15px] leading-relaxed text-text-secondary">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
