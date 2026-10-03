import Audience from "@/components/marketing/Audience";
import EarlyAccessSection from "@/components/marketing/EarlyAccessSection";
import Hero from "@/components/marketing/Hero";
import HowItWorks from "@/components/marketing/HowItWorks";
import KelpCase from "@/components/marketing/KelpCase";
import Monitoring from "@/components/marketing/Monitoring";
import Principles from "@/components/marketing/Principles";
import ProductShots from "@/components/marketing/ProductShots";

export default function HomePage() {
  return (
    <main className="bg-white">
      <Hero />
      <HowItWorks />
      <KelpCase />
      <ProductShots />
      <Monitoring />
      <Audience />
      <Principles />
      <EarlyAccessSection />
    </main>
  );
}
