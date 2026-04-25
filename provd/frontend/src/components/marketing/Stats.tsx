export default function Stats() {
  return (
    <section className="py-20 bg-bg-surface border-b border-bg-border">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Capabilities</div>
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">Counterparty trust scoring</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            Score every counterparty using cross-platform dispute history, wallet activity, hashed payment identifiers, and repeat-risk patterns, so you know exactly who to approve, not just who to block.
          </p>
        </div>
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Deployment</div>
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">Built into your approval decision</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            Integrate Provd at the exact point where your platform decides to approve, review, or hold a trade. Responses include a score, reason flags, and a recommended action your operators can act on immediately.
          </p>
        </div>
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Operators</div>
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">For growth teams and risk teams</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            Designed for exchanges, wallets, and OTC desks that want to expand volume without expanding fraud exposure. Provd gives both sides of the business, revenue and risk, a shared, evidence-backed decision layer.
          </p>
        </div>
      </div>
    </section>
  );
}
