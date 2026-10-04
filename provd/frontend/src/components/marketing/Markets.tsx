type Market = { region: string; rails: string; currencies: string };

const MARKETS: Market[] = [
  { region: "East Africa", rails: "M-Pesa, Airtel Money, bank transfer", currencies: "KES · TZS · UGX" },
  { region: "West Africa", rails: "Bank transfer, mobile wallets", currencies: "NGN · GHS · XOF" },
  { region: "Latin America", rails: "Pix, SPEI, bank transfer", currencies: "BRL · MXN · ARS" },
  { region: "South & Southeast Asia", rails: "UPI, GCash, bank transfer", currencies: "INR · PHP · VND" },
  { region: "Türkiye & Middle East", rails: "FAST, bank transfer", currencies: "TRY · AED · EGP" },
  { region: "Anywhere else", rails: "Send any rail and currency", currencies: "fiat_rail · fiat_currency" },
];

export default function Markets() {
  return (
    <section className="border-b border-bg-border bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
          <div className="min-w-0">
            <h2 className="font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
              One check. Your local context.
            </h2>
            <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-text-secondary">
              <p>
                Wherever stablecoins meet a local payment rail, the release decision looks the same: the fiat says it
                arrived, the crypto is about to leave.
              </p>
              <p>
                The crypto side is checked the same way everywhere. The local side is context: your rail, your
                currency, and the outcomes you report. Amount baselines are learned per currency from your own
                history, so a normal trade in Lagos and a normal trade in São Paulo are each judged against what&apos;s
                normal for you there.
              </p>
              <p className="text-text-primary">Built in Kenya. Live today on USDT (Tron) and USDC/USDT (Solana), for any local rail.</p>
            </div>
          </div>
          <ul className="grid min-w-0 gap-px self-start overflow-hidden rounded-md border border-bg-border bg-bg-border sm:grid-cols-2">
            {MARKETS.map((m) => (
              <li key={m.region} className="bg-white p-5">
                <div className="font-sans text-base font-semibold text-text-primary">{m.region}</div>
                <div className="mt-1 text-[15px] text-text-secondary">{m.rails}</div>
                <div className="mt-2 font-mono text-xs text-text-muted">{m.currencies}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
