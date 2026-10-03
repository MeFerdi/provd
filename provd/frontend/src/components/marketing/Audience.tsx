const AUDIENCES = [
  { title: "Curators & allocators", body: "Know what you're allocating into." },
  { title: "Insurers", body: "Price cover on configuration, not reputation." },
  { title: "Protocol teams", body: "Catch a weak setting before attackers do." },
  { title: "Funds & treasuries", body: "Due diligence that stays current." },
];

export default function Audience() {
  return (
    <section className="border-b border-bg-border bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex items-end gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/networking.png" alt="" width={48} height={48} loading="lazy" className="hidden h-12 w-12 shrink-0 sm:block" />
          <h2 className="max-w-2xl font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
            For anyone exposed to a bridge they don&apos;t control.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map(({ title, body }) => (
            <div key={title} className="rounded-md border border-bg-border bg-white p-6">
              <h3 className="font-sans text-lg font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
