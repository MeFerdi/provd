import React from "react";

export default function TrustSignals() {
  return (
    <section className="py-20 bg-bg-base border-t border-bg-border border-b">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        <div>
          <div className="font-mono text-[11px] text-text-muted tracking-[0.15em]">AUDITABILITY</div>
          <div className="font-sans font-medium text-[20px] text-text-primary mt-2">Every approval decision is explainable.</div>
          <div className="font-sans text-[14px] text-text-secondary mt-3 leading-relaxed">
            Provd logs the signals behind every score. Your risk and operations teams can review exactly why a counterparty was approved, flagged, or held, making every decision auditable, defensible, and improvable.
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {["Risk review", "Case evidence", "Operator decisions", "Internal audit"].map((pill) => (
              <span key={pill} className="font-mono text-[11px] bg-bg-elevated border border-bg-border text-text-secondary px-3 py-1 rounded-[3px]">{pill}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] text-text-muted tracking-[0.15em]">DATA HANDLING</div>
          <ul className="space-y-4 mt-4">
            <li className="flex items-start gap-3">
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="1.5" viewBox="0 0 16 16" role="presentation" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="3" /><path d="M5 8h6" /><path d="M8 5v6" /></svg>
              <span className="font-sans text-[14px] text-text-secondary leading-relaxed">Identifiers are hashed client-side before leaving your environment.</span>
            </li>
            <li className="flex items-start gap-3">
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="1.5" viewBox="0 0 16 16" role="presentation" aria-hidden="true"><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2" /><path d="M8 2v4" /><path d="M8 10v4" /><path d="M2 8h4" /><path d="M10 8h4" /></svg>
              <span className="font-sans text-[14px] text-text-secondary leading-relaxed">Network signals are shared without any raw PII crossing platform boundaries.</span>
            </li>
            <li className="flex items-start gap-3">
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="1.5" viewBox="0 0 16 16" role="presentation" aria-hidden="true"><ellipse cx="8" cy="8" rx="6" ry="3" /><path d="M2 8c0 3.314 2.686 6 6 6s6-2.686 6-6" /></svg>
              <span className="font-sans text-[14px] text-text-secondary leading-relaxed">Aggregated intelligence stays separated from user-facing application data.</span>
            </li>
            <li className="flex items-start gap-3">
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="1.5" viewBox="0 0 16 16" role="presentation" aria-hidden="true"><path d="M8 2l6 6H2z" /><path d="M8 14l-6-6h12z" /></svg>
              <span className="font-sans text-[14px] text-text-secondary leading-relaxed">Provd sees patterns, never personal data.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
