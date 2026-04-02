import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import Markdown from "@/components/ui/markdown";

export const metadata = {
  title: "Terms of Service — Provd",
};

export default function TermsPage() {
  return (
    <Section className="pt-14 pb-16" padded={false}>
      <Container size="default">
        <div className="uppercase text-accent-primary font-mono text-xs mb-4" style={{ letterSpacing: "0.22em" }}>Legal</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-5">Terms of Service</h1>
            <Markdown>{[
              '**Provd Technologies Ltd.**',
              '**Effective date:** 1 April 2026',
              '**Last updated:** 1 April 2026',
              '',
              '---',
              '',
              '## 1. Agreement',
              '',
              'These Terms of Service ("Terms") constitute a legally binding agreement between Provd Technologies Ltd., a company registered in Kenya ("Provd", "we", "us"), and the entity accessing or using the Provd API and platform ("Client", "you").',
              '',
              'By creating an account, accessing the API, or using any Provd service, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you are agreeing on behalf of an organisation, you represent that you have authority to bind that organisation.',
              '',
              'If you do not agree to these Terms, do not use the service.',
              '',
              '---',
              '',
              '## 2. The service',
              '',
              'Provd provides a B2B fraud intelligence API that returns risk scores and signals for counterparty entities in peer-to-peer cryptocurrency transactions. The service includes:',
              '',
              '- The Provd Trust Score API (`/v1/trust/score`)',
              '- The Dispute Intelligence API (`/v1/dispute/analyze`) on eligible plans',
              '- The Provd compliance dashboard',
              '- Documentation, support, and related services',
              '',
              '**Provd is an intelligence service, not a financial service.** We do not hold, transfer, or exchange cryptocurrency or fiat currency. We do not make decisions about whether specific trades should be approved or rejected. All decisions about how to act on Provd\'s scores and recommendations remain entirely with the Client.',
              '',
              '---',
              '',
              '## 3. Account registration',
              '',
              'To use the service, you must register for an account. You agree to:',
              '',
              '- Provide accurate and complete information during registration',
              '- Keep your account credentials confidential',
              '- Notify us immediately of any unauthorised access to your account at security@provd.io',
              '- Be responsible for all activity that occurs under your account',
              '',
              'You must be a legally incorporated business entity to register for a Provd account. We do not provide service to individuals acting in a personal capacity.',
              '',
              '---',
              '',
              '## 4. Permitted use',
              '',
              'You may use the service to:',
              '',
              '- Query counterparty risk scores in connection with legitimate P2P cryptocurrency trading operations',
              '- Analyse trade disputes using the Dispute Intelligence module',
              '- Integrate Provd\'s API into your exchange, wallet, or compliance platform',
              '',
              'You may not:',
              '',
              '- Use the service to harass, discriminate against, or make consequential decisions about individuals without appropriate human oversight',
              '- Resell, relicense, or provide the service to third parties as a standalone product without a white-label agreement',
              '- Attempt to reverse-engineer Provd\'s models, scoring methodology, or fraud intelligence graph',
              '- Submit false or fabricated dispute data, outcome labels, or fraud reports',
              '- Use the service in any jurisdiction where doing so is prohibited by law',
              '- Use the service for any purpose that violates applicable law, including privacy law and financial services regulation',
            ].join('\n')}</Markdown>
      </Container>
    </Section>
  );
}
