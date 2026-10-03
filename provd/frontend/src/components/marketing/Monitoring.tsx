const ALERTS = [
  "A verifier is removed from a route",
  "An admin key or delegate is swapped",
  "A new route opens with a single verifier",
];

export default function Monitoring() {
  return (
    <section className="border-b border-bg-border bg-bg-surface py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-14">
        <div className="min-w-0 overflow-hidden rounded-md border border-bg-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/home/security-operations-center.jpg"
            width={6016}
            height={4016}
            alt="Security operations team monitoring systems"
            loading="lazy"
            decoding="async"
            className="block h-auto max-h-[440px] w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h2 className="mb-5 font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
            Configuration changes quietly. You hear about it first.
          </h2>
          <p className="text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
            Provd re-reads every contract it covers and compares each read with the last one. When a setting that
            decides a protocol&apos;s security changes, you get an alert:
          </p>
          <ul className="mt-5 divide-y divide-bg-border border-y border-bg-border">
            {ALERTS.map((a) => (
              <li key={a} className="py-3 text-[16px] text-text-primary">
                {a}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[16px] leading-relaxed text-text-secondary">
            Alerts go to your webhook or Telegram.
          </p>
        </div>
      </div>
    </section>
  );
}
