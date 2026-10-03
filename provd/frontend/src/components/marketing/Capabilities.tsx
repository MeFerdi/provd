const CAPABILITIES = [
  {
    title: "Pre-release scoring",
    body: "Score a transaction before funds move, with a signal-by-signal explanation of what raised or lowered the risk.",
  },
  {
    title: "Counterparty checks on USDT-Tron",
    body: "Each wallet is checked against the 7,700+ addresses Tether has frozen, and against the wallets it has traded with.",
  },
  {
    title: "Your history counts",
    body: "Report reversals and confirmed fraud, and future checks learn from them. Your data stays yours — it is never pooled with other platforms.",
  },
  {
    title: "Decision records",
    body: "Every check is stored as a hashed record you can verify later for audit. Signed, anchored proof is coming.",
  },
  {
    title: "Pay as you go",
    body: "Buy checks like airtime. Top up with USDT or M-Pesa. No monthly plan to sign.",
  },
];

const RAILS = [
  { label: "USDT on Tron", status: "Live" },
  { label: "M-Pesa", status: "Fiat context" },
  { label: "Bank rails", status: "Fiat context" },
  { label: "Stellar", status: "Next" },
];

export default function Capabilities() {
  return (
    <section className="border-b border-bg-border bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-10 max-w-2xl font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
          What you get.
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ title, body }) => (
            <div key={title} className="rounded-md border border-bg-border bg-white p-6">
              <h3 className="font-sans text-lg font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{body}</p>
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
              Agent-ready API — the same intents work for automated agents.
            </p>
          </div>
        </div>

        <p className="mt-10 max-w-3xl border-l-2 border-text-primary pl-5 text-[16px] leading-relaxed text-text-primary sm:text-[17px]">
          Device identity is not our layer — we work alongside device-trust providers. We decide whether to release the
          funds.
        </p>
      </div>
    </section>
  );
}
