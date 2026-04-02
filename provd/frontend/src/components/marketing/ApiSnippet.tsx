import { Container } from "../ui/container";
import { Section } from "../ui/section";
import { Card, CardContent, CardHeader } from "../ui/card";

export default function ApiSnippet() {
  return (
    <Section className="border-b border-bg-border" variant="base">
      <Container size="lg">
        <div className="grid items-end gap-10 md:grid-cols-2">
          <div>
            <div className="uppercase text-accent-primary font-mono text-[0.7rem] sm:text-xs tracking-[0.22em] mb-3">API</div>
            <h2 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.06]">Request and response shape</h2>
          </div>
          <p className="text-text-secondary text-lg md:text-xl max-w-xl md:justify-self-end leading-relaxed">
            The API is designed for synchronous approval checks. Send trade context before release and use the response in your
            approval, review, or escalation path.
          </p>
        </div>

        <div className="mt-10">
          <Card className="overflow-hidden">
            <CardHeader className="flex items-center justify-between gap-4 border-b border-bg-border bg-bg-elevated p-4">
              <div className="font-mono text-xs text-text-secondary tracking-[0.18em] uppercase">Python</div>
              <div className="font-mono text-xs text-text-muted">POST /v1/counterparties/score</div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-bg-base overflow-x-auto">
                <pre className="p-6 text-sm md:text-base font-mono text-text-code whitespace-pre leading-relaxed">
{`# Python example
import httpx

client = httpx.Client(
    base_url="https://api.provd.io",
    headers={"Authorization": f"Bearer {PROVD_API_KEY}"}
)

response = client.post("/v1/counterparties/score", json={
    "wallet_address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "phone_hash": "sha256:a3f8c2d4e5b6...",
    "payment_rail": "mpesa",
    "country": "KE",
    "chain": "celo",
    "context": {
        "trade_type": "p2p_sell",
        "amount_usd": 500,
        "desk_id": "ke-p2p-desk-1"
    }
})

score = response.json()
print(f"Counterparty Score: {score['counterparty_score']}")
print(f"Risk Level:  {score['risk_level']}")
print(f"Flags:       {score['risk_flags']}")
print(f"Action:      {score['recommended_action']}")
`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
