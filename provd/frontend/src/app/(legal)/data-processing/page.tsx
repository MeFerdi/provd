import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import Markdown from "@/components/ui/markdown";

export const metadata = {
  title: "Data Processing — Provd",
};

export default function DataProcessingPage() {
  return (
    <Section className="pt-14 pb-16" padded={false}>
      <Container size="default">
        <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Legal</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-5">Data Processing</h1>
            <Markdown>{`
          # Data Processing Agreement

          **Provd Technologies Ltd.**
          **Effective date:** 1 April 2026

          This Data Processing Agreement ("DPA") forms part of and supplements the Terms of Service between Provd Technologies Ltd. ("Provd" or "Processor") and the Client ("Controller"). Capitalised terms not defined here have the meanings given in the Terms of Service.

          ---

          ## 1. Definitions

          **"Controller"** means the Client entity that determines the purposes and means of processing personal data submitted to the Provd API.

          **"Processor"** means Provd Technologies Ltd., which processes personal data on behalf of the Controller.

          **"Personal Data"** means any information relating to an identified or identifiable natural person processed in connection with the Provd service.

          **"Processing"** has the meaning given under applicable data protection law and includes operations performed on personal data.

          **"Sub-processor"** means any third party engaged by Provd to process personal data on its behalf.

          **"Applicable Law"** means, as relevant to the Controller and the Processor respectively: the Kenya Data Protection Act 2019, the Nigeria Data Protection Regulation 2019, the South Africa POPIA 2013, the GDPR (EU) 2016/679, and any implementing legislation in force in the relevant jurisdiction.

          ---

          ## 2. Scope and purpose

          This DPA applies to the processing of Personal Data by Provd as Processor acting on the instructions of the Controller in connection with the provision of the Provd fraud intelligence service.

          The nature and purpose of processing, the types of personal data, and the categories of data subjects are set out in **Schedule 1** to this DPA.

          ---

          ## 3. Controller obligations

          The Controller warrants and undertakes that:

          3.1 It has a lawful basis under Applicable Law to process the Personal Data it submits and to instruct Provd to process that data.

          3.2 It has provided all required notices to, and obtained all required consents from, data subjects where necessary.

          3.3 All personal identifiers submitted to the Provd API are anonymised via SHA-256 hashing with the formatting specified in Provd's technical documentation before transmission. The Controller acknowledges that Provd processes only hashed identifiers and not plaintext personal data.

          3.4 It will not submit to the Provd API any data falling into special categories of personal data as defined under Applicable Law (including health data, biometric data, racial or ethnic origin, religious belief, or sexual orientation).

          ---

          ## 4. Processor obligations

          Provd, as Processor, agrees to:

          4.1 **Process only on documented instructions.** Process Personal Data only on the documented instructions of the Controller, as set out in these Terms and this DPA, unless required by law.

          4.2 **Confidentiality.** Ensure that persons authorised to process Personal Data have committed to confidentiality or are under an appropriate statutory obligation of confidentiality.

          4.3 **Security.** Implement appropriate technical and organisational measures to protect Personal Data against accidental or unlawful destruction, loss, alteration, unauthorised disclosure, or access. Current security measures are described in Schedule 2.

          4.4 **Sub-processors.** Not engage a Sub-processor without prior written authorisation from the Controller (general authorisation is given in Schedule 3 for current Sub-processors). Provd will impose data protection obligations on Sub-processors equivalent to those in this DPA.

          4.5 **Data subject rights.** Assist the Controller to respond to requests from data subjects exercising their rights under Applicable Law, taking into account the nature of the processing.
            `}</Markdown>
      </Container>
    </Section>
  );
}
