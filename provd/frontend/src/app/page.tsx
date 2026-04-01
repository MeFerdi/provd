import Hero from "../components/marketing/Hero";
import Stats from "../components/marketing/Stats";
import HowItWorks from "../components/marketing/HowItWorks";
import FraudTypes from "../components/marketing/FraudTypes";
import ApiSnippet from "../components/marketing/ApiSnippet";
import Pricing from "../components/marketing/Pricing";
import TrustSignals from "../components/marketing/TrustSignals";
import CTA from "../components/marketing/CTA";

export default function HomePage() {
  return (
    <main className="bg-bg-base">
      <Hero />
      <Stats />
      <HowItWorks />
      <FraudTypes />
      <ApiSnippet />
      <Pricing />
      <TrustSignals />
      <CTA />
    </main>
  );
}
