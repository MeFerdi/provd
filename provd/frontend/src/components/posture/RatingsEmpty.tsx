import { Button } from "@/components/ui/button";

export function RatingsEmpty({ title = "Ratings are being generated" }: { title?: string }) {
  return (
    <div className="rounded-md border border-dashed border-bg-border bg-white p-6 sm:p-10">
      <h2 className="mt-3 font-display text-2xl text-text-primary md:text-3xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary md:text-base">
        We are reading the first set of LayerZero V2 contracts on Ethereum and publishing their ratings here once each one
        is checked. In the meantime you can scan any contract yourself, or read how grades are produced.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button href="/scan" size="lg">
          Scan a contract
        </Button>
        <Button href="/methodology" size="lg" variant="secondary">
          Read the methodology
        </Button>
      </div>
    </div>
  );
}
