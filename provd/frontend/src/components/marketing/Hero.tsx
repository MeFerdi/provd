import React from "react";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="pt-32 pb-24 bg-bg-base border-b border-bg-border min-h-[80vh] flex items-center">
      <div className="w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
        {/* Left column: Security-focused content, flex-1 for 80% width usage */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-accent" />
            <span className="font-mono text-[11px] text-accent tracking-[0.15em]">P2P SECURITY INFRASTRUCTURE</span>
          </div>
          <h1 className="font-display text-[44px] md:text-[60px] text-text-primary leading-[1.1] mb-6 max-w-2xl">
            Secure every trade.<br />Protect every user.
          </h1>
          <p className="font-sans text-[18px] text-text-secondary leading-[1.7] max-w-xl mb-10">
            Provd is the security backbone for African P2P crypto markets. Our AI-powered API delivers real-time counterparty risk scores, fraud detection, and compliance intelligence—before the transaction executes.
          </p>
          <div className="flex gap-4 mt-10">
            <a href="#get-api-access" className="bg-accent text-[#07090E] font-sans font-medium text-[15px] px-7 py-3 rounded-[4px] transition hover:brightness-110 hover:-translate-y-[1px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">Get API Access →</a>
            <a href="/whitepaper" className="border border-bg-border text-text-secondary font-sans text-[15px] px-7 py-3 rounded-[4px] transition hover:border-text-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">Read the Whitepaper</a>
          </div>
        </div>
        {/* Right column: Large security audit image asset, flex-1 for 80% width usage */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div className="relative flex flex-col items-center gap-6">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-2xl bg-accent/10 blur-2xl w-[340px] h-[340px]" style={{ zIndex: 0 }} />
            </div>
            <Image
              src="/assets/home/3d-cryptocurrency-rendering-design-removebg-preview.png"
              alt="Security Audit Badge"
              width={620}
              height={620}
              className="relative z-10 drop-shadow-2xl rounded-2xl"
              style={{ background: "transparent" }}
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
