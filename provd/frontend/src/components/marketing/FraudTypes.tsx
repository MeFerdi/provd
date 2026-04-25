import React from "react";
import Image from "next/image";

const FRAUD_TYPES = [
  {
    tag: "INPUT 01",
    title: "Dispute and fraud history",
    icon: <Image src="/fraud-alert.png" alt="Non-Delivery Fraud" width={40} height={40} />,
    body: "Prior non-delivery, reversals, and operator-reviewed cases from across the network feed directly into the score.",
    detection: "Case linkage, repeat outcomes, and dispute velocity"
  },
  {
    tag: "INPUT 02",
    title: "Payment rail behavior",
    icon: <Image src="/money.png" alt="Payment Reversal" width={40} height={40} />,
    body: "Rail-specific patterns across M-Pesa, bank transfers, and stablecoin payouts reveal timing anomalies and reversal habits invisible to a single platform.",
    detection: "Reversal patterns, rail mismatches, and timing anomalies"
  },
  {
    tag: "INPUT 03",
    title: "Cross-platform identity linkage",
    icon: <Image src="/data-migration.png" alt="Platform Migration" width={40} height={40} />,
    body: "Wallets, hashed phone values, and other identifiers are matched to prior outcomes across partners, without ever exposing raw PII.",
    detection: "Hash reuse, wallet linkage, and identity graph joins"
  },
  {
    tag: "INPUT 04",
    title: "Entity network graph",
    icon: <Image src="/networking.png" alt="Coordinated Networks" width={40} height={40} />,
    body: "Connected accounts and wallets are evaluated together. A counterparty with clean history but fraudulent neighbours gets flagged, not approved.",
    detection: "Cluster analysis, shared infrastructure, and graph proximity"
  },
  {
    tag: "INPUT 05",
    title: "Shared partner intelligence",
    icon: <Image src="/social-engineering.png" alt="Social Engineering" width={40} height={40} />,
    body: "Every connected platform contributes signals back to the network. The more partners, the harder it becomes for bad actors to move between desks undetected.",
    detection: "Partner-fed outcomes and cross-platform fraud indicators"
  }
];

export default function FraudTypes() {
  return (
    <section className="py-[120px] bg-bg-surface">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center">
          <div className="font-mono text-[11px] text-accent tracking-[0.15em] mb-2">SIGNAL COVERAGE</div>
          <h2 className="font-display text-[48px] text-text-primary mt-4">Signals that separate good counterparties from bad ones.</h2>
          <p className="font-sans text-[18px] text-text-secondary mt-4 max-w-2xl mx-auto">
            Provd sits between trade intent and fund release. Each signal category contributes to a score that tells your platform not just whether a counterparty is risky, but how confident you can be approving them.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          {FRAUD_TYPES.map((ft, i) => (
            <div
              key={ft.tag}
              className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 hover:border-accent/40 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="font-mono text-[10px] tracking-[0.1em] bg-accent/10 text-accent px-2 py-1 rounded-[3px]">{ft.tag}</span>
                <span>{ft.icon}</span>
              </div>
              <div className="font-sans font-medium text-[18px] text-text-primary mt-4">{ft.title}</div>
              <div className="font-sans text-[14px] text-text-secondary mt-2 leading-relaxed">{ft.body}</div>
              <div className="font-mono text-[12px] text-text-muted mt-4 border-t border-bg-border pt-4">
                <span className="text-accent text-[10px] mr-2">EVALUATION:</span> {ft.detection}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
