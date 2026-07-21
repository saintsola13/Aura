import { LegalPage } from "@/components/legal-page";
export default function Page() {
  return (
    <LegalPage
      title="Copyright Policy"
      updated="July 20, 2026"
      sections={[
        {
          title: "Reporting infringement",
          body: "Send a signed notice identifying the protected work, the allegedly infringing AURA material and location, your contact information, a good-faith statement, and a statement under penalty of perjury that the information is accurate and you are authorized to act. Designated agent: [NAME, ADDRESS, EMAIL — LEGAL REVIEW REQUIRED].",
        },
        {
          title: "Counter-notices",
          body: "A person whose content was removed may submit a legally sufficient counter-notice identifying the removed material, consenting to appropriate jurisdiction, and stating under penalty of perjury that removal resulted from mistake or misidentification. AURA may restore content as applicable law permits.",
        },
        {
          title: "Repeat infringement",
          body: "AURA may terminate repeat infringers in appropriate circumstances and may act on clear infringement independently of a formal notice. Fraudulent claims may create liability. This policy is not legal advice.",
        },
      ]}
    />
  );
}
