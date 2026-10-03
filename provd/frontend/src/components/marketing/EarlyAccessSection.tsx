import { EarlyAccessForm } from "@/components/early-access/EarlyAccessForm";

export default function EarlyAccessSection({ id = "early-access" }: { id?: string }) {
  return (
    <section id={id} className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="min-w-0">
          <h2 className="mb-5 font-display text-[30px] leading-tight text-text-primary md:text-[42px]">
            Get alerts on the protocols you depend on.
          </h2>
          <p className="text-[16px] leading-relaxed text-text-secondary">
            Continuous monitoring, change alerts, watchlists and API access are in early access. Design partners get free
            access during the beta.
          </p>
        </div>
        <EarlyAccessForm id={`${id}-form`} />
      </div>
    </section>
  );
}
