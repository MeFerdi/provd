import Link from "next/link";

const SHOTS = [
  {
    src: "/assets/product/scan-result.png",
    alt: "Provd scan result for Kelp DAO's rsETH adapter: routes, verifiers and admin accounts read from Ethereum",
    caption: "A live scan of Kelp's rsETH adapter today: every route now requires four verifiers.",
  },
  {
    src: "/assets/product/kelp-research.png",
    alt: "Configuration table from Provd's Kelp DAO analysis",
    caption: "From our analysis: 24 of 26 routes relied on a single verifier when the exploit happened.",
  },
];

export default function ProductShots() {
  return (
    <section className="border-b border-bg-border bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-3xl">
          <h2 className="mb-4 font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
            What a rating looks like.
          </h2>
          <p className="text-[16px] leading-relaxed text-text-secondary sm:text-[17px]">
            Each rating lists every route into a contract, the verifiers that must attest a message on it, and the accounts
            that can change those settings. Every finding names the rule that produced it and links to the on-chain
            evidence.{" "}
            <Link href="/methodology" className="text-accent-secondary hover:underline">
              Read the methodology
            </Link>
            .
          </p>
        </div>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
          {SHOTS.map((shot) => (
            <figure key={shot.src} className="min-w-0">
              <div className="overflow-hidden rounded-md border border-bg-border bg-bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.src} width={1280} height={900} alt={shot.alt} loading="lazy" className="h-auto w-full" />
              </div>
              <figcaption className="mt-3 text-sm leading-relaxed text-text-secondary">{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
