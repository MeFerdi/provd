export default function Stats() {
  return (
    <section className="py-20 bg-bg-surface border-b border-bg-border">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: What Provd Does */}
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">What We Do</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            Provd delivers real-time counterparty risk scoring and fraud intelligence for African P2P crypto markets. We help exchanges and platforms prevent fraud before it happens.
          </p>
        </div>
        {/* Card 2: How We Work */}
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">How It Works</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            Our API analyzes on-chain history, behavioral graphs, and fiat payment signals—returning a trust score, risk flags, and recommended action for every trade in under 200ms.
          </p>
        </div>
        {/* Card 3: Our Mission */}
        <div className="bg-bg-elevated border border-bg-border rounded-[8px] p-8 flex flex-col gap-4">
          <h3 className="font-sans font-semibold text-[20px] text-text-primary mb-2">Our Mission</h3>
          <p className="font-sans text-[15px] text-text-secondary leading-relaxed">
            To build the security infrastructure for Africa’s P2P crypto economy—enabling safe, compliant, and trusted peer-to-peer trading for millions of users.
          </p>
        </div>
      </div>
    </section>
  );
}
