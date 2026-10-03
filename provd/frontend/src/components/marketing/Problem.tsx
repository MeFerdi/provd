import ReleaseTimeline from "@/components/marketing/ReleaseTimeline";

const LOSSES = [
  {
    title: "Reversals after release",
    body: "The buyer's local payment (mobile money, Pix, UPI or a bank transfer) is pulled back after the crypto has gone out.",
  },
  {
    title: "Fake payment confirmations",
    body: "A forged SMS or screenshot says the money arrived. It didn't.",
  },
  {
    title: "SIM-swap takeovers",
    body: "Someone else now controls the phone number, and the account behind it.",
  },
  {
    title: "Repeat bad counterparties",
    body: "The same wallet or number comes back under a new account and does it again.",
  },
];

export default function Problem() {
  return (
    <section className="border-b border-bg-border bg-bg-surface py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-14">
        <div className="order-last min-w-0 lg:order-none">
          <ReleaseTimeline />
        </div>
        <div className="min-w-0">
          <h2 className="mb-5 font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
            Platforms release first and find out later.
          </h2>
          <p className="text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
            P2P desks and ramps settle in seconds, but the losses arrive afterwards:
          </p>
          <dl className="mt-5 divide-y divide-bg-border border-y border-bg-border">
            {LOSSES.map((l) => (
              <div key={l.title} className="py-3.5">
                <dt className="text-[16px] font-medium text-text-primary">{l.title}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-text-secondary">{l.body}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[16px] leading-relaxed text-text-primary">
            Today the release decision is a guess. Provd makes it a scored, explained, recorded check.
          </p>
        </div>
      </div>
    </section>
  );
}
