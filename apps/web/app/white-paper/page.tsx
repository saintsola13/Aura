import { SocialShell } from "@/components/site-chrome";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AURA White Paper",
  description: "AURA's product vision, scope, limitations, safety principles, risks, and directional roadmap.",
};

const sections = [
  {
    title: "Phase 3 product status",
    body: <>AURA now includes editable and public profiles, follows, chronological feeds, posts, one-image media, replies, likes, reposts, mentions, and notifications. These features currently use a clearly labeled development-only user switcher. The development header is temporary and is rejected by the production Worker; production authentication is not complete. Wallet addresses remain manually entered, public, unverified profile references and are never used as authentication.</>,
  },
  {
    title: "1. What AURA is",
    body: <>AURA is a social discovery and presentation layer for public Ethereum addresses. People can manually enter any public address to view and organize public profile and NFT information associated with that address. AURA is designed as a calm interface for expression, discovery, and community context. An address shown in AURA is a lookup value, not a verified identity or proof that the person entering it controls that address.</>,
  },
  {
    title: "2. Core social and NFT features",
    body: <>The product direction includes public profiles, display names and bios, avatar presentation, follows, feeds, collections, comments, reactions, discovery, curation, and community spaces. NFT experiences may show collection membership, public token metadata, media, traits, creator or contract references, and user-created showcases. Social labels and profile edits are AURA-layer data; they do not modify a blockchain or the underlying NFT.</>,
  },
  {
    title: "3. Manual public-address policy",
    body: <>AURA only accepts an Ethereum address that a person manually copies and pastes. The browser validates the format as <code>0x</code> followed by 40 hexadecimal characters, normalizes it, and saves it locally on that device. AURA does not use browser-extension or wallet-application connection interfaces and does not request wallet permissions, signatures, seed phrases, private keys, transaction approvals, or cryptographic challenges.</>,
  },
  {
    title: "4. What AURA does not do",
    body: <>AURA is not a wallet, custodian, exchange, marketplace, broker, investment adviser, identity verifier, authentication provider, or transaction service. It does not hold assets or keys; initiate, sign, simulate, relay, approve, or reverse transactions; verify ownership or control of addresses or NFTs; guarantee identity claims; recover assets; or provide financial, legal, tax, or security advice. Public-address lookup must never be interpreted as authentication.</>,
  },
  {
    title: "5. NFT-data limitations",
    body: <>NFT and blockchain information can be incomplete, delayed, duplicated, unavailable, incorrectly indexed, misleading, malicious, or changed by third-party contracts and metadata hosts. Media may disappear or contain unsafe content. Contract standards vary, spam assets exist, and displayed attribution may be wrong. AURA may cache, filter, label, omit, or reformat data and cannot guarantee authenticity, provenance, scarcity, ownership, legality, value, or continued availability.</>,
  },
  {
    title: "6. Aura Score limitations",
    body: <>A future Aura Score may summarize visible participation, reputation signals, or community context. Any score will be experimental, approximate, contestable, and subject to data quality, weighting choices, manipulation, bias, and change. It will not prove identity, trustworthiness, creditworthiness, ownership, expertise, legal status, or asset value and must not be used for lending, employment, housing, insurance, eligibility, investment, or other high-impact decisions.</>,
  },
  {
    title: "7. Moderation and safety",
    body: <>AURA may establish rules, reporting, blocking, muting, ranking controls, content labels, automated filters, human review, appeals, and restrictions on accounts or content. These systems will not catch every harmful act and may make mistakes. Users remain responsible for what they publish and should independently assess links, media, people, and claims. AURA may preserve or disclose information when reasonably necessary for safety, legal compliance, or enforcement.</>,
  },
  {
    title: "8. Privacy and data",
    body: <>Public blockchain addresses and activity are inherently observable and may be correlated by others. The manually entered address is currently stored in local browser storage, while profile, moderation, operational, security, and analytics data may be processed by AURA infrastructure as features develop. Users should not publish sensitive personal information. Data practices, retention, lawful bases, rights, cookies, processors, and jurisdiction-specific disclosures belong in the separate Privacy Policy.</>,
  },
  {
    title: "9. Intellectual property",
    body: <>AURA software, branding, interface, and original materials may be protected by intellectual-property rights. Users must have the rights needed for content they submit. Displaying public NFT metadata does not transfer copyright, trademark, publicity, or commercial rights and token possession does not necessarily grant intellectual-property rights. Rights-holder notices and disputes will be handled under a separate Copyright Policy and applicable law.</>,
  },
  {
    title: "10. Future AI features and limitations",
    body: <>Possible AI-assisted features include discovery, summaries, recommendations, moderation support, accessibility, profile drafting, and creative organization. AI output may be inaccurate, biased, incomplete, offensive, outdated, or fabricated and may miss context or rights concerns. AI will not establish identity, ownership, authenticity, legal conclusions, asset value, or safety. Material AI features should be labeled, reviewable where appropriate, and governed by privacy and safety controls.</>,
  },
  {
    title: "11. Service availability",
    body: <>AURA is evolving and may experience latency, errors, security incidents, data loss, chain reorganizations, third-party outages, maintenance, geographic restrictions, feature changes, or discontinuation. Features may be experimental or released gradually. No uptime, preservation, compatibility, or perpetual-access promise is made in this paper, and users should retain independent copies of important information.</>,
  },
  {
    title: "12. Governance and policy changes",
    body: <>AURA presently uses product-team governance. Community research, feedback, transparency reports, councils, or other participatory models may inform future decisions, but no token voting or decentralized governance commitment is made. Product rules, scoring methods, moderation practices, policies, and this paper may change as risks, law, technology, and community needs develop. Material changes should be communicated through appropriate product or policy channels.</>,
  },
  {
    title: "13. Directional roadmap",
    body: <>The directional sequence is: establish reliable public-address profiles and data foundations; add social discovery, collections, feeds, and safety tooling; improve creator and community presentation; experiment carefully with transparent reputation context and AI assistance; and explore participatory governance mechanisms. This roadmap is aspirational, has no guaranteed dates, and may change, pause, or be abandoned.</>,
  },
  {
    title: "14. Risk disclosures",
    body: <>Risks include public-address correlation, impersonation, harassment, scams, malicious links or media, inaccurate indexing, intellectual-property disputes, regulatory change, software vulnerabilities, third-party failures, moderation mistakes, algorithmic bias, manipulation of social or scoring systems, and loss of locally stored preferences. Crypto assets can be volatile and risky; AURA does not recommend acquiring, selling, or holding them. Users must conduct independent diligence.</>,
  },
  {
    title: "15. Relationship to formal policies",
    body: <>This white paper explains product direction and limitations; it is not a contract, offer, promise, or complete legal disclosure. It does not replace AURA's Terms of Service, Privacy Policy, Community Guidelines, Copyright Policy, or any formal financial, regulatory, consumer, security, or jurisdiction-specific legal disclosures. If those documents conflict with this paper, the applicable formal policy or legal disclosure controls.</>,
  },
];

export default function WhitePaperPage() {
  return (
    <SocialShell>
      <article className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
        <div className="border-b border-white/[.08] pb-12">
          <p className="text-xs font-medium uppercase tracking-[.22em] text-violet-300">WP · Version 1.0 · July 2026</p>
          <h1 className="mt-5 text-balance text-5xl font-medium tracking-[-.055em] sm:text-6xl">AURA White Paper</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">
            Product vision, operating boundaries, known limitations, and a directional path for a safer public-address social layer.
          </p>
          <Link href="/settings" className="mt-7 inline-flex text-sm text-zinc-500 transition hover:text-white">← Back to Settings</Link>
        </div>

        <div className="divide-y divide-white/[.07]">
          {sections.map((section) => (
            <section key={section.title} className="py-10">
              <h2 className="text-xl font-medium tracking-[-.025em] text-zinc-100">{section.title}</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400 [&_code]:rounded [&_code]:bg-white/[.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-zinc-300">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </SocialShell>
  );
}
