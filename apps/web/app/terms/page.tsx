import { LegalPage } from "@/components/legal-page";
export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="July 20, 2026"
      sections={[
        {
          title: "Eligibility and accounts",
          body: "You must be legally able to agree to these terms and meet the minimum digital-consent age where you live. You are responsible for email and X sign-in methods linked to your account, account activity, and accurate profile information. AURA may suspend, disable, or terminate accounts to protect people, comply with law, or enforce its policies.",
        },
        {
          title: "The service",
          body: "AURA provides social profiles, posts, media, following, engagement, and notifications for NFT culture. Features may change, pause, or end. Email and X are authentication providers; X does not own or control an AURA account.",
        },
        {
          title: "Wallet references",
          body: "Wallet addresses are manually entered public profile references. AURA does not connect to wallets, verify ownership, request signatures, initiate transactions, provide custody, or treat a wallet address as authentication, authorization, recovery, or identity proof.",
        },
        {
          title: "Your content and rights",
          body: "You retain ownership of content you submit. You grant AURA a worldwide, non-exclusive license to host, reproduce, adapt for technical display, distribute, and display it to operate and improve the service. You represent that you have the required rights. Follow the Community Guidelines, Acceptable Use Policy, and Copyright Policy.",
        },
        {
          title: "Prohibited activity",
          body: "Do not commit fraud, phishing, wallet-draining, impersonation, harassment, exploitation, infringement, spam, artificial engagement, security abuse, scraping that harms the service, or illegal activity.",
        },
        {
          title: "Disclaimers and liability",
          body: "AURA is provided as available without guarantees of uninterrupted operation, asset value, authenticity, ownership, preservation, or fitness for a particular purpose, to the extent permitted by law. NFT and third-party data may be incomplete or wrong. Liability exclusions and limits require jurisdiction-specific legal review before launch.",
        },
        {
          title: "Termination, law, and contact",
          body: "You may stop using AURA or request deletion. Some provisions survive termination. GOVERNING LAW AND VENUE: [PLACEHOLDER — QUALIFIED COUNSEL MUST SELECT]. Contact: [LEGAL CONTACT PLACEHOLDER].",
        },
      ]}
    />
  );
}
