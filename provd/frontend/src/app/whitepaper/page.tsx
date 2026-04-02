"use client";

export default function WhitepaperPage() {
  return (
    <section className="min-h-[80vh] bg-bg-base px-4 py-24">
      <div className="mx-auto max-w-3xl rounded-2xl border border-bg-border bg-bg-surface p-8 shadow-lg md:p-10">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-primary">Technical Whitepaper</div>
        <h1 className="mb-5 font-display text-[36px] text-text-primary md:text-[48px]">Provd Whitepaper</h1>
        <p className="mb-8 max-w-2xl font-sans text-[16px] leading-relaxed text-text-secondary">
          Provd is building fraud-intelligence infrastructure for African P2P crypto, stablecoin, and OTC workflows. The
          whitepaper outlines the problem landscape, system architecture, scoring flow, privacy model, and operational role of
          counterparty intelligence in approval and dispute processes.
        </p>

        <div className="mb-8 rounded-2xl border border-bg-border bg-bg-base/60 p-5">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Overview</div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-bg-border bg-bg-surface/60 p-4">
              <div className="font-sans text-[15px] font-semibold text-text-primary">What it covers</div>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Problem definition, approval workflow placement, signal inputs, risk scoring, dispute intelligence, and
                auditability.
              </p>
            </div>
            <div className="rounded-xl border border-bg-border bg-bg-surface/60 p-4">
              <div className="font-sans text-[15px] font-semibold text-text-primary">Who it is for</div>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Exchanges, wallets, OTC desks, partners, and technical reviewers evaluating how Provd fits into fraud and
                compliance operations.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-accent/20 bg-accent/5 p-5">
          <div className="font-sans text-[15px] font-semibold text-text-primary">Review status</div>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            The official whitepaper is still undergoing internal review. A public downloadable version will be made available
            once the technical and legal review process is complete.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-bg-elevated px-7 py-3 font-sans text-[15px] font-medium text-text-muted opacity-80"
          >
            Download Whitepaper
          </button>
          <a
            href="/docs"
            className="inline-flex min-h-12 items-center justify-center rounded-[4px] border border-bg-border px-7 py-3 font-sans text-[15px] text-text-secondary transition hover:border-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            View documentation
          </a>
        </div>
      </div>
    </section>
  );
}
