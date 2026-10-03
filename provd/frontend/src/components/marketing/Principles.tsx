const PRINCIPLES = [
  { title: "Evidence over opinion", body: "Every finding links to the on-chain source it was read from." },
  {
    title: "Explainable",
    body: "Every grade shows the rules that produced it.",
    link: { href: "/methodology", label: "See the methodology" },
  },
  {
    title: "Responsible disclosure",
    body: "We notify teams privately before publishing new critical findings.",
  },
  { title: "Independent", body: "No protocol pays for its rating." },
];

const COVERAGE = [
  { label: "LayerZero V2 OApps & OFTs on Ethereum", status: "Live" },
  { label: "More chains", status: "Next" },
  { label: "Wormhole", status: "Next" },
  { label: "Chainlink CCIP", status: "Next" },
  { label: "Hyperlane", status: "Next" },
  { label: "Timelocks & upgrade admin", status: "Next" },
];

export default function Principles() {
  return (
    <section className="border-b border-bg-border bg-bg-surface py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="min-w-0">
          <h2 className="mb-8 font-display text-[30px] leading-tight text-text-primary md:text-[42px]">How we rate.</h2>
          <dl className="divide-y divide-bg-border border-y border-bg-border">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="grid gap-1 py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
                <dt className="font-sans font-semibold text-text-primary">{p.title}</dt>
                <dd className="text-[15px] leading-relaxed text-text-secondary">
                  {p.body}{" "}
                  {p.link ? (
                    <a href={p.link.href} className="text-accent-secondary hover:underline">
                      {p.link.label}
                    </a>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="min-w-0">
          <h2 className="mb-8 font-display text-[30px] leading-tight text-text-primary md:text-[42px]">Starting narrow.</h2>
          <ul className="divide-y divide-bg-border border-y border-bg-border">
            {COVERAGE.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 py-3 text-[15px]">
                <span className="text-text-primary">{c.label}</span>
                <span className={c.status === "Live" ? "text-sm font-medium text-grade-a" : "text-sm text-text-muted"}>
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
