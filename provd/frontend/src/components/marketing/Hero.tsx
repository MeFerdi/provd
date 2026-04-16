import React from "react";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="border-b border-bg-border bg-bg-base pt-28 pb-18 sm:pb-20 lg:min-h-[80vh] lg:flex lg:items-center">
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(460px,1.1fr)] lg:items-center lg:gap-10">
        <div className="min-w-0 max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent" />
            <span className="font-mono text-[11px] text-accent tracking-[0.15em]">FRAUD INTELLIGENCE FOR AFRICAN P2P RAILS</span>
          </div>
          <h1 className="mb-6 max-w-[11ch] font-display text-[40px] leading-[1.05] text-text-primary sm:text-[48px] lg:text-[60px]">
            Know the counterparty<br />before the trade clears.
          </h1>
          <p className="mb-10 max-w-xl font-sans text-[16px] leading-[1.7] text-text-secondary sm:text-[18px]">
            Provd helps African exchanges, wallets, and OTC desks block repeat fraud before funds move. Query one API call and get network-backed counterparty risk, dispute signals, and recommended actions across P2P stablecoin flows.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="/playground" className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-bg-surface px-7 py-3 font-sans text-[15px] font-medium text-text-primary transition hover:-translate-y-[1px] hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Try playground
            </a>
            <a href="/docs/quickstart" className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-accent px-7 py-3 font-sans text-[15px] font-medium text-[#07090E] transition hover:-translate-y-[1px] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Read Documentation
            </a>
            <a href="/docs/api-reference" className="inline-flex min-h-12 items-center justify-center rounded-[4px] border border-bg-border px-7 py-3 font-sans text-[15px] text-text-secondary transition hover:border-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              View API Reference
            </a>
          </div>
        </div>
        <div className="min-w-0 w-full lg:flex lg:justify-end">
          <div className="relative mx-auto flex min-h-[360px] w-full max-w-[460px] items-center justify-center sm:min-h-[430px] sm:max-w-[520px] lg:mx-0 lg:min-h-[560px] lg:w-[137.8%] lg:justify-end">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[260px] w-[260px] rounded-full bg-accent/10 blur-3xl sm:h-[320px] sm:w-[320px] lg:h-[380px] lg:w-[380px]" />
              <div className="absolute right-[8%] top-[14%] h-20 w-20 rounded-full bg-accent-blue/10 blur-3xl sm:h-24 sm:w-24 lg:right-[10%] lg:top-[12%] lg:h-28 lg:w-28" />
            </div>
            <div className="relative z-10 w-full max-w-[460px] sm:max-w-[520px] lg:mr-[-196px]">
              <div className="pointer-events-none absolute left-1/2 top-[88%] h-[58px] w-[260px] -translate-x-1/2 rounded-full bg-black/22 blur-2xl sm:h-[72px] sm:w-[320px] lg:h-[86px] lg:w-[380px]" />
              <div className="pointer-events-none absolute left-1/2 top-[92%] h-[24px] w-[180px] -translate-x-1/2 rounded-full bg-black/16 blur-xl sm:h-[28px] sm:w-[220px] lg:h-[34px] lg:w-[280px]" />
              <Image
                src="/two-factor-authentication-confirmation-removebg-preview.png"
                alt="Two-factor approval illustration representing secure verification"
                width={1200}
                height={1200}
                className="relative z-10 h-auto w-full object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
