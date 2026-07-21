import { LegalPage } from "@/components/legal-page";
export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 20, 2026"
      sections={[
        {
          title: "Data we process",
          body: "We process verified email addresses; X subject ID and current basic profile details; AURA account, profile, manually entered public wallet address, posts, media, follows and engagement; session cookies and device summaries; shortened or secret-peppered network identifiers; and security events. Public profile content, posts, media, and wallet references are public.",
        },
        {
          title: "How and why",
          body: "We use data to create accounts, authenticate, provide social features, prevent abuse, secure sessions, moderate content, communicate service messages, comply with law, and improve reliability. We do not use manually entered wallet addresses to authenticate or verify ownership.",
        },
        {
          title: "Providers and transfers",
          body: "Cloudflare processes hosting, Workers, D1, R2, Turnstile, network, and security data. Resend delivers transactional email. X provides OAuth identity data when you choose Continue with X. These providers may process data internationally under their own terms and safeguards.",
        },
        {
          title: "Cookies and security",
          body: "AURA uses HttpOnly session cookies and a CSRF cookie. Session tokens are hashed before D1 storage. We retain security events and hashed network identifiers for proportionate security periods; we do not intentionally retain raw OAuth codes, provider access tokens, or magic-link tokens after their purpose.",
        },
        {
          title: "Retention, deletion, and rights",
          body: "We retain account data while active and as needed for security, disputes, law, and backups. Account deletion has a 30-day cancellation period, followed by deletion or anonymization according to operational policy. Public blockchain records are outside AURA's control. Depending on location, you may request access, correction, deletion, portability, restriction, or objection. Contact: [PRIVACY CONTACT PLACEHOLDER].",
        },
        {
          title: "Children and changes",
          body: "AURA is not directed to children below the applicable digital-consent age. International users should understand that data may be processed where our providers operate. Material policy changes will be posted and, when appropriate, notified in-product or by email.",
        },
      ]}
    />
  );
}
