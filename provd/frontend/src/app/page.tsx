import Capabilities from "@/components/marketing/Capabilities";
import ContactSection from "@/components/marketing/ContactSection";
import Hero from "@/components/marketing/Hero";
import HowItWorks from "@/components/marketing/HowItWorks";
import Markets from "@/components/marketing/Markets";
import Problem from "@/components/marketing/Problem";
import Segments from "@/components/marketing/Segments";

export default function HomePage() {
  return (
    <main className="bg-white">
      <Hero />
      <Problem />
      <Segments />
      <HowItWorks />
      <Capabilities />
      <Markets />
      <ContactSection />
    </main>
  );
}
