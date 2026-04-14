export default function Stats() {
  return (
    <section className="py-20 bg-bg-surface border-b border-bg-border">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Capabilities</div>
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">Counterparty risk scoring</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            Score counterparties before release using wallet activity, hashed payment identifiers, prior disputes, and repeat-risk
            patterns across connected partners.
          </p>
        </div>
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Deployment</div>
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">Built for approval workflows</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            Integrate Provd at the point where your platform decides to approve, review, or block a trade. Responses return risk
            level, reason flags, and a recommended action for operators.
          </p>
        </div>
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Operators</div>
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">Used by trading and risk teams</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            Designed for exchanges, wallets, OTC desks, and stablecoin products that need a shared decision layer for fraud review,
            user protection, and dispute handling in African payment corridors.
          </p>
        </div>
      </div>
    </section>
  );
}
