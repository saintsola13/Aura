import { LegalPage } from "@/components/legal-page";
export default function Page() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      updated="July 20, 2026"
      sections={[
        {
          title: "Safety and legality",
          body: "Do not use AURA for illegal goods or services, exploitation, threats, fraud, phishing, malicious links, malware, unauthorized access, privacy violations, sanctions evasion, or activity that creates material risk to people or systems.",
        },
        {
          title: "Platform integrity",
          body: "Do not probe or bypass security, evade rate limits or enforcement, scrape disruptively, overload infrastructure, distribute executable content through media, automate deceptive engagement, impersonate others, or manipulate metrics.",
        },
        {
          title: "NFT-specific risk",
          body: "Do not misrepresent ownership, provenance, rarity, value, affiliation, or endorsements. A manually entered wallet reference proves nothing. Do not ask others for private keys, seed phrases, wallet permissions, signatures, or transaction approval through AURA.",
        },
        {
          title: "Enforcement",
          body: "We may investigate, preserve relevant records, remove content, restrict access, suspend accounts, and cooperate with valid legal process. Report abuse at [SAFETY CONTACT PLACEHOLDER].",
        },
      ]}
    />
  );
}
