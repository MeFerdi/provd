/** Problem-section visual: how a reversal loss unfolds when release happens before any check. Illustrative. */
type Step = { time: string; title: string; body: string; tone?: "loss" };

const STEPS: Step[] = [
  { time: "14:02", title: "Buyer marks the order paid", body: "An M-Pesa confirmation for KES 65,000 shows up in the chat." },
  { time: "14:03", title: "You release 500 USDT", body: "It lands in seconds. Crypto can't be pulled back." },
  { time: "14:21", title: "The USDT moves on", body: "Forwarded to another wallet, then another." },
  { time: "16:40", title: "The payment is reversed", body: "The KES 65,000 goes back to the buyer.", tone: "loss" },
];

export default function ReleaseTimeline() {
  return (
    <figure className="w-full">
      <div className="rounded-md border border-bg-border bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-bg-border px-5 py-3">
          <span className="text-sm font-medium text-text-primary">How a reversal loss happens</span>
          <span className="text-sm text-text-muted">P2P trade</span>
        </div>
        <ol className="px-5 py-5">
          {STEPS.map((step, i) => (
            <li key={step.time} className="relative flex gap-4 pb-5 last:pb-0">
              {i < STEPS.length - 1 ? (
                <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-bg-border" />
              ) : null}
              <span
                aria-hidden
                className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${
                  step.tone === "loss" ? "border-accent-danger bg-accent-danger" : "border-text-muted bg-white"
                }`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-[13px] text-text-muted">{step.time}</span>
                  <span
                    className={`text-[15px] font-medium ${step.tone === "loss" ? "text-accent-danger" : "text-text-primary"}`}
                  >
                    {step.title}
                  </span>
                </div>
                <p className="mt-0.5 text-[14px] leading-relaxed text-text-secondary">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="border-t border-bg-border bg-accent-danger/5 px-5 py-4">
          <div className="text-[15px] font-semibold text-accent-danger">Loss: 500 USDT</div>
          <p className="mt-1 text-[14px] leading-relaxed text-text-secondary">
            Nothing on record shows what was known at 14:03, or why the release went ahead.
          </p>
        </div>
        <div className="px-5 py-4 text-[14px] text-text-primary">
          With Provd, the check runs at 14:03, before the USDT leaves.
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-text-muted">Illustration of a typical reversal.</figcaption>
    </figure>
  );
}
