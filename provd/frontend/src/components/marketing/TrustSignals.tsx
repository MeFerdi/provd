import React from "react";

export default function TrustSignals() {
  return (
    <section className="py-20 bg-bg-base border-t border-bg-border border-b">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        {/* Left: Regulatory positioning */}
        <div>
          <div className="font-mono text-[11px] text-text-muted tracking-[0.15em]">REGULATORY COMPLIANCE</div>
          <div className="font-sans font-medium text-[20px] text-text-primary mt-2">Built for regulated African exchanges.</div>
          <div className="font-sans text-[14px] text-text-secondary mt-3 leading-relaxed">
            Provd is designed as compliance infrastructure. Our data processing agreements, privacy architecture, and audit trails are built to satisfy Kenya CMA and Nigeria SEC user protection requirements.
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {['Kenya DPA 2019', 'Nigeria NDPR', 'South Africa POPIA', 'GDPR-equivalent'].map((pill) => (
              <span key={pill} className="font-mono text-[11px] bg-bg-elevated border border-bg-border text-text-secondary px-3 py-1 rounded-[3px]">{pill}</span>
            ))}
          </div>
        </div>
        {/* Right: Privacy architecture */}
        <div>
          <div className="font-mono text-[11px] text-text-muted tracking-[0.15em]">PRIVACY BY DESIGN</div>
          <ul className="space-y-4 mt-4">
            <li className="flex items-start gap-3">
              {/* SHA-256 icon */}
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="1.5" viewBox="0 0 16 16" role="presentation" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="3" /><path d="M5 8h6" /><path d="M8 5v6" /></svg>
              <span className="font-sans text-[14px] text-text-secondary leading-relaxed">SHA-256 commitment scheme — identifiers are hashed before leaving your infrastructure.</span>
            </li>
            <li className="flex items-start gap-3">
              {/* Federated intelligence icon */}
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="1.5" viewBox="0 0 16 16" role="presentation" aria-hidden="true"><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2" /><path d="M8 2v4" /><path d="M8 10v4" /><path d="M2 8h4" /><path d="M10 8h4" /></svg>
              <span className="font-sans text-[14px] text-text-secondary leading-relaxed">Federated intelligence — we never receive raw PII, only anonymized signals.</span>
            </li>
            <li className="flex items-start gap-3">
              {/* Differential privacy icon */}
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="1.5" viewBox="0 0 16 16" role="presentation" aria-hidden="true"><ellipse cx="8" cy="8" rx="6" ry="3" /><path d="M2 8c0 3.314 2.686 6 6 6s6-2.686 6-6" /></svg>
              <span className="font-sans text-[14px] text-text-secondary leading-relaxed">Differential privacy — ε=1.0 Laplace noise on all aggregated statistics.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
