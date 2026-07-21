# AURA White Paper

Version 1.0 — July 2026

## Status and purpose

This white paper describes AURA's product vision, intended operating boundaries, known limitations, major risks, and directional roadmap. It is an explanatory product document, not a contract, investment document, offer, guarantee, or complete legal disclosure.

## Phase 4 product status

AURA supports passwordless email magic links, Continue with X through OAuth 2.0 with PKCE, opaque server-side sessions, provider linking, session revocation, centralized authorization, Turnstile, distributed Cloudflare rate limits, moderation states, and a 30-day account-deletion grace period. Email links are consumed only after an explicit confirmation POST; X access tokens are not retained. Production resource provisioning, sender and domain verification, X application configuration, qualified legal review, and an external media-scanning service remain launch requirements.

Wallet addresses remain manually entered public profile references. They are unverified and never used for authentication, authorization, recovery, signing, transactions, custody, or ownership proof.

See the [Terms](legal/TERMS.md), [Privacy Policy](legal/PRIVACY.md), [Community Guidelines](legal/COMMUNITY-GUIDELINES.md), [Copyright Policy](legal/COPYRIGHT.md), and [Acceptable Use Policy](legal/ACCEPTABLE-USE.md).

## Phase 3 product status

Phase 3 introduces editable profiles, public profile pages, follows, chronological following and explore feeds, text and one-image posts, replies, likes, reposts, mentions, and readable notifications. Media is stored through the configured R2 binding; social records and relationships are stored in D1.

The current interactive product uses a visibly labeled **Development session** user switcher. It stores a selected demo user ID locally and sends it in `X-Aura-Dev-User`. This mechanism is temporary, is not secure authentication, and is accepted only when the API environment is not production. The production Worker rejects mutation requests that rely on it. A real non-wallet session system is still required before production social mutations can be enabled.

Wallet references remain manual only. AURA does not connect to wallet software. Any public wallet address displayed on a profile was manually entered, is not verified, and is never evidence that the profile editor controls the address.

## 1. What AURA is

AURA is a social discovery and presentation layer for information associated with public Ethereum addresses. It is intended to make public profiles, NFT collections, creative context, and community participation easier to explore and organize through a calm, human-centered interface.

People identify an address in AURA by manually copying and pasting a public `0x` Ethereum address. AURA treats that address only as a lookup value. Displaying, entering, following, or editing AURA-layer information associated with an address does not establish who controls the address and must not be treated as verified identity, authentication, or proof of ownership.

AURA combines public-source information with product-layer social data. Public blockchain data may include addresses, token identifiers, contract events, and metadata references. AURA-layer data may include display names, bios, avatars, follows, comments, reactions, lists, moderation state, and preferences. AURA-layer changes do not modify a blockchain.

## 2. Core social and NFT features

The intended social foundation includes:

- public profiles organized around manually entered public addresses;
- optional display names, biographies, avatars, links, and creative presentation;
- following, feeds, reactions, comments, collections, lists, and discovery;
- creator, collector, and community spaces;
- reporting, blocking, muting, content labels, ranking controls, and appeals;
- user-controlled curation of visible public information; and
- contextual signals that help people navigate communities without claiming verified identity.

The intended NFT experience includes public collection views, token media and metadata, traits, creator or contract references, and user-created showcases. These displays are informational. They do not transfer an NFT, alter token metadata, establish provenance, verify authenticity, prove lawful ownership, or grant intellectual-property rights.

Features may launch experimentally, change substantially, be restricted by region or eligibility, or never launch.

## 3. Manual public wallet-address policy

AURA must not connect to crypto wallets. The only supported wallet-identification flow is manual entry of a public Ethereum address.

The user copies and pastes a public address. The client validates the format as `0x` followed by exactly 40 hexadecimal characters, normalizes the value to lowercase, and stores it locally in that browser. The user can change or remove the value at any time.

AURA does not request or use:

- browser-extension or wallet-application connection interfaces;
- wallet permissions or account lists;
- seed or recovery phrases;
- private keys;
- transaction creation, approval, or signing;
- message signatures or cryptographic challenges; or
- cryptographic proof that a person controls an address.

A public address is safe to look up, but its activity is publicly observable and may be correlated with other data. Users should consider that privacy consequence before entering or sharing an address.

## 4. What AURA does not do

AURA is not a wallet, custodian, exchange, broker, marketplace, investment adviser, bank, identity provider, authentication provider, blockchain oracle, or transaction service.

AURA does not:

- possess or safeguard assets, credentials, keys, or recovery phrases;
- initiate, construct, simulate, sign, sponsor, relay, approve, settle, cancel, or reverse blockchain transactions;
- verify a person's ownership or control of an address, token, account, profile, or identity;
- provide cryptographic identity verification;
- guarantee that a profile name, avatar, biography, or claim is truthful;
- guarantee authenticity, provenance, legality, scarcity, market value, or future performance;
- recover lost assets or credentials;
- promise that displayed data is current, complete, accurate, or available; or
- provide financial, investment, legal, tax, accounting, security, or regulatory advice.

No AURA screen, label, score, profile association, badge, or social action should be interpreted as authentication or ownership verification.

## 5. NFT and blockchain-data limitations

NFT and blockchain information comes from contracts, nodes, indexers, gateways, metadata servers, content-addressed systems, marketplaces, creators, holders, and other third parties. It may be incomplete, delayed, duplicated, incorrectly decoded, reorged, unavailable, misleading, malicious, or inconsistent across sources.

NFT metadata and media can change or disappear. A token URI may point to mutable infrastructure. Media may contain malware, tracking, flashing content, harassment, infringements, or deceptive material. Contract interfaces vary, standards may be implemented incorrectly, spam tokens can be sent without consent, and collection names or symbols can be impersonated.

AURA may cache, resize, proxy, filter, label, rank, omit, or reformat public data for performance, safety, and presentation. Those actions can introduce delay or error. AURA cannot guarantee:

- token or collection authenticity;
- creator identity or attribution;
- provenance or transaction history;
- present or past control of an asset;
- intellectual-property or commercial-use rights;
- rarity, scarcity, price, liquidity, or value;
- absence of malicious code or content; or
- permanent access to metadata or media.

Users must independently verify material claims through appropriate primary sources and professional advice where necessary.

## 6. Aura Score limitations

A future Aura Score may summarize visible participation, reputation signals, content quality, community context, or other product signals. If introduced, its methodology may include public data, AURA-layer activity, moderation state, statistical modeling, and community input.

Any Aura Score will be experimental, approximate, contestable, and subject to incomplete data, weighting choices, gaming, collusion, sybil behavior, popularity effects, cultural bias, model error, and change over time. A score can be wrong and may not represent the context a viewer expects.

Aura Score will not prove or verify identity, address control, asset ownership, authenticity, trustworthiness, expertise, creditworthiness, legal status, reputation outside AURA, or the value or quality of an asset. It must not be used to make lending, credit, employment, housing, education, insurance, healthcare, immigration, law-enforcement, investment, access-control, or other high-impact decisions.

AURA should provide meaningful explanations, feedback paths, abuse resistance, and correction or appeal mechanisms before using scores prominently. The scoring system may be changed, limited, reset, or withdrawn.

## 7. Moderation, community integrity, and safety

AURA's goal is to support expression and discovery without ignoring abuse. Product safety may include Community Guidelines, reporting, blocking, muting, content warnings, visibility controls, spam detection, automated classification, human review, appeals, rate limits, sanctions, and restrictions on accounts, addresses, content, links, or features.

Moderation systems cannot identify every harmful act. Automated systems can be biased or inaccurate, human reviewers can make mistakes, context can be missing, and enforcement may be inconsistent or delayed. AURA does not guarantee that content or interactions will be safe, lawful, accurate, or suitable.

Users remain responsible for their content and conduct. They should treat unsolicited links, claims, offers, files, and contact as potentially risky; use independent verification; and report urgent threats to appropriate authorities. AURA may preserve, restrict, or disclose information when reasonably necessary to enforce policies, investigate abuse, protect people or systems, respond to valid legal process, or comply with law.

## 8. Privacy and data

Ethereum addresses, token events, and other blockchain activity are public by design. Entering or displaying an address can make correlation easier. A person should not assume pseudonymity will prevent others from linking an address to names, accounts, locations, behavior, or other addresses.

In the current client, the manually entered address is normalized and saved in local browser storage. Removing it clears that local preference. As AURA develops, its infrastructure may process profile content, social relationships, reports, moderation records, support communications, device and request information, security logs, analytics, and other operational data.

Users should not publish private keys, recovery phrases, precise location, government identifiers, financial credentials, or other sensitive personal information. AURA will define retention, access controls, deletion practices, processors, international transfers, lawful bases, cookies, user rights, and jurisdiction-specific disclosures in a separate Privacy Policy. This white paper is not that policy.

## 9. Intellectual property

AURA's software, brand, designs, documentation, and original content may be protected by copyright, trademark, patent, trade-secret, or other rights. Use of AURA does not transfer those rights except where an applicable license expressly says otherwise.

Users must have the rights and permissions needed to submit or display content through AURA. Public availability of an image or metadata record does not mean it is free to copy, commercialize, modify, or use as a trademark. Possession of an NFT does not necessarily convey copyright, trademark, publicity, moral, licensing, or commercial rights in associated material.

AURA's display of public NFT information is informational and may be restricted after valid notices or safety review. Rights-holder requests, counter-notices, repeat-infringer rules, and related procedures belong in a separate Copyright Policy. Trademark, publicity, privacy, and other disputes may require different processes.

## 10. Future AI features and limitations

Potential AI-assisted features include content discovery, summaries, recommendations, translation, accessibility support, moderation assistance, spam detection, profile drafting, collection organization, and creative tools.

AI output may be inaccurate, outdated, incomplete, biased, offensive, overconfident, or fabricated. Models may miss cultural context, sarcasm, ownership disputes, licensing restrictions, or emerging abuse. Recommendations can create feedback loops or unfairly amplify and suppress content. Automated moderation can produce false positives and false negatives.

AI features will not establish identity, address control, ownership, authenticity, provenance, legal conclusions, financial value, or safety. They should not be relied on for high-impact or professional decisions. Material AI-assisted experiences should be labeled where appropriate, monitored, subject to privacy and safety review, and paired with human judgment and correction paths. Proposed capabilities may be delayed, narrowed, or abandoned.

## 11. Service availability and change

AURA is evolving software. It may experience bugs, latency, inaccurate displays, data loss, chain reorganizations, compromised dependencies, security incidents, denial-of-service activity, third-party outages, scheduled maintenance, or permanent discontinuation.

Features and data may be unavailable in some devices, browsers, networks, jurisdictions, or account states. Experimental features may have stricter limits and may be removed without migration. AURA does not promise continuous uptime, compatibility, preservation, error-free operation, permanent links, or perpetual access in this white paper.

Users should retain independent copies of important material and should not rely on AURA as the sole record of identity, ownership, rights, communications, collections, or community history.

## 12. Governance and policy changes

AURA currently uses product-team governance. Research, user feedback, safety expertise, transparency reporting, community councils, or other participatory mechanisms may inform future decisions. This white paper makes no promise of token governance, voting rights, decentralized control, revenue participation, or legal ownership in AURA.

Product rules, ranking systems, scoring methods, moderation practices, technical architecture, access conditions, policies, and this paper may change in response to law, regulation, security, abuse, evidence, technology, business conditions, and community needs. Material changes should be communicated through appropriate product or policy channels, with effective dates where relevant.

Governance experiments may be advisory, limited, reversible, or discontinued. Participation in them does not necessarily create contractual, fiduciary, corporate, property, or regulatory rights.

## 13. Directional roadmap

The roadmap is directional, not a delivery commitment:

1. **Foundation:** reliable public-address lookup, local address preferences, profile primitives, resilient data ingestion, clear limitations, and baseline safety controls.
2. **Social layer:** follows, feeds, reactions, comments, lists, collections, discovery, notification controls, blocking, muting, and reporting.
3. **Creator and community tools:** richer showcases, collaborative spaces, moderation roles, attribution context, analytics with privacy safeguards, and portable exports.
4. **Context experiments:** transparent, contestable reputation signals and Aura Score research with strong anti-abuse and high-impact-use restrictions.
5. **AI assistance:** carefully labeled discovery, accessibility, creative, and moderation support with evaluation, human review, and correction paths.
6. **Participatory governance:** research into community input, councils, transparency mechanisms, and policy feedback without presuming token voting or decentralization.

Priorities, ordering, scope, and timing may change. Any item may be redesigned, delayed, restricted, or abandoned. The roadmap is not a promise of functionality or financial value.

## 14. Risk disclosures

Using AURA may involve risks including:

- correlation of a public address with a person or other activity;
- impersonation and false profile claims because address control is not verified;
- harassment, fraud, scams, phishing, malicious links, and unsafe media;
- incomplete, inaccurate, manipulated, or unavailable blockchain and NFT data;
- metadata mutation, intellectual-property disputes, and misleading attribution;
- moderation errors, algorithmic bias, unwanted ranking effects, and score manipulation;
- vulnerabilities, compromised dependencies, service interruption, and third-party failure;
- regulatory, legal, sanctions, tax, and policy changes across jurisdictions;
- loss of locally stored settings when browser data is cleared; and
- mistaken reliance on social context, scores, profiles, or roadmap statements.

Crypto assets can be volatile, illiquid, manipulated, stolen, or rendered inaccessible. AURA does not recommend or facilitate buying, selling, transferring, or holding them. Users are responsible for independent diligence, security practices, legal compliance, taxes, and professional advice.

## 15. Distinction from formal policies and disclosures

This white paper communicates product direction and boundaries. It is distinct from and does not replace:

- **Terms of Service**, which govern the contractual conditions for using AURA;
- **Privacy Policy**, which explains personal-data practices and legal rights;
- **Community Guidelines**, which define permitted conduct and content enforcement;
- **Copyright Policy**, which provides rights-holder notice and dispute procedures; and
- **formal legal disclosures**, including any financial, regulatory, consumer, security, accessibility, regional, or feature-specific notices required by law or product design.

Those documents serve different purposes and may be introduced or revised separately. If this white paper conflicts with an applicable formal policy, agreement, or legal disclosure, that formal document controls. Nothing in this paper waives legal rights, creates a fiduciary relationship, guarantees a roadmap item, or changes mandatory consumer protections.

## Closing principle

AURA's premise is modest: public onchain information can be made more humane and socially useful without asking for access to anyone's wallet. The product should make its uncertainty visible, minimize dangerous implications, and earn trust through clear boundaries rather than cryptographic theater.
