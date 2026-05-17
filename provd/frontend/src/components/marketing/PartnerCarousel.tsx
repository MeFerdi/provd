import Image from "next/image";

// const partnerBrands = [
//   {
//     label: "Busha",
//     src: "/assets/partners/busha.svg",
//     alt: "Busha logo",
//   },
//   {
//     label: "Quidax",
//     src: "/assets/partners/quidax.png",
//     alt: "Quidax logo",
//   },
//   {
//     label: "Kotani Pay",
//     src: "/assets/partners/kotani.svg",
//     alt: "Kotani Pay logo",
//   },
//   {
//     label: "Bitnob",
//     src: "/assets/partners/bitnob.svg",
//     alt: "Bitnob logo",
//   },
//   {
//     label: "Lopeer",
//     src: "/assets/partners/lopeer.png",
//     alt: "Lopeer logo",
//   },
// ];

// const logos = [...partnerBrands, ...partnerBrands];

export default function PartnerCarousel() {
  return (
    <section className="bg-bg-surface py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
              Designed for partners
            </div>
            <h2 className="font-display text-[30px] leading-[1.05] text-text-primary sm:text-[38px]">
              The infrastructure layer connecting Africa&apos;s P2P ecosystem.
            </h2>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-[24px] bg-bg-base/70 px-4 py-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg-base via-bg-base/85 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg-base via-bg-base/85 to-transparent" />

          {/* <div className="logo-marquee flex w-max items-stretch gap-4 pr-4">
            {logos.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex min-w-[220px] items-center gap-4 px-5 py-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center p-2">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-sans text-[16px] font-medium text-text-primary">{item.label}</div>
                </div>
              </div>
            ))}
          </div> */}
        </div>
      </div>
    </section>
  );
}
