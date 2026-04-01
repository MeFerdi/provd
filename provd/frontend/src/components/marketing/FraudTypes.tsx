import React from "react";
import Image from "next/image";

const FRAUD_TYPES = [
  {
    tag: "F1",
    title: "Non-Delivery Fraud",
    icon: <Image src="/fraud-alert.png" alt="Non-Delivery Fraud" width={40} height={40} />,
    body: "Scammer receives fiat via M-Pesa or bank transfer. Crypto is never sent.",
    detection: "New account + zero trade history + isolated graph node"
  },
  {
    tag: "F2",
    title: "Payment Reversal",
    icon: <Image src="/money.png" alt="Payment Reversal" width={40} height={40} />,
    body: "Crypto delivered, then fiat reversed via bank chargeback days later.",
    detection: "Temporal delay pattern + dispute velocity spike"
  },
  {
    tag: "F3",
    title: "Platform Migration",
    icon: <Image src="/data-migration.png" alt="Platform Migration" width={40} height={40} />,
    body: "Banned actor creates a new account on a different exchange with a clean slate.",
    detection: "Cross-platform behavioral fingerprint matching"
  },
  {
    tag: "F4",
    title: "Coordinated Networks",
    icon: <Image src="/networking.png" alt="Coordinated Networks" width={40} height={40} />,
    body: "Multiple accounts share devices or payment rails to defraud at scale.",
    detection: "Graph cluster analysis reveals shared infrastructure"
  },
  {
    tag: "F5",
    title: "Social Engineering",
    icon: <Image src="/social-engineering.png" alt="Social Engineering" width={40} height={40} />,
    body: "Victims recruited via WhatsApp, Telegram, or X before being directed to P2P.",
    detection: "Community NLP pipeline + social signal integration"
  }
];

export default function FraudTypes() {
  return (
    <section className="py-[120px] bg-bg-surface">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center">
          <div className="font-mono text-[11px] text-accent tracking-[0.15em] mb-2">WHAT PROVD DETECTS</div>
          <h2 className="font-display text-[48px] text-text-primary mt-4">Five fraud patterns. One API.</h2>
          <p className="font-sans text-[18px] text-text-secondary mt-4 max-w-2xl mx-auto">
            African P2P crypto fraud doesn&apos;t look like DeFi exploits. These are the five patterns Provd is built to catch.
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
                <span className="text-accent text-[10px] mr-2">DETECTION:</span> {ft.detection}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
