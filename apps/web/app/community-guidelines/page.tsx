import { LegalPage } from "@/components/legal-page";
export default function Page() {
  return (
    <LegalPage
      title="Community Guidelines"
      updated="July 20, 2026"
      sections={[
        {
          title: "Protect people from fraud",
          body: "No scams, phishing, wallet-draining links, deceptive asset claims, impersonation, coordinated fraud, or manipulation. Never solicit seed phrases, private keys, signatures, transaction approvals, or wallet permissions.",
        },
        {
          title: "Treat people with dignity",
          body: "No targeted harassment, credible threats, hateful conduct, sexual exploitation, child sexual abuse material, non-consensual intimate content, doxxing, or glorification of serious violence. Graphic content may be removed or restricted even when documentary.",
        },
        {
          title: "Keep participation authentic",
          body: "No spam, malicious automation, artificial engagement, repetitive promotion, evasion, compromised accounts, or misleading identity practices. Credit creators and respect copyright, trademark, publicity, and other rights.",
        },
        {
          title: "Enforcement and appeals",
          body: "AURA may reduce visibility, remove content, limit features, suspend or disable accounts, preserve evidence, and report emergencies or illegal content. Severity, context, history, and risk inform enforcement. Appeals will be available through [APPEALS CONTACT PLACEHOLDER].",
        },
      ]}
    />
  );
}
