# AURA

AURA is a premium social platform for NFT culture, built as a pnpm/Turborepo monorepo on Next.js 15, Hono, Cloudflare Workers, D1, R2, and OpenNext.

## Phase 4

Production identity is an AURA account—not a wallet. Accounts support passwordless email magic links and Continue with X (OAuth 2.0 Authorization Code with PKCE), multiple linked methods, hashed opaque server sessions, CSRF/origin protection, session revocation, moderation states, and delayed deletion. Public wallet addresses remain manually entered, unverified profile references and are never used for authentication, recovery, authorization, signing, transactions, or custody.

The social product includes public/editable profiles, follows, chronological feeds, text and single-image posts, replies, reposts, likes, mentions, notifications, search, and mobile navigation.

## Repository

```text
apps/web          Next.js App Router web application
apps/api          Hono Cloudflare Worker, migrations, and seed
packages/ui       Shared React primitives
packages/shared   Domain/auth types, validation, and security primitives
docs/legal        Initial operational legal drafts
```

## Local development

Prerequisites: Node.js 20+, pnpm 10, and Wrangler authentication for remote work.

```bash
cp .env.example apps/web/.env.local
cp .dev.vars.example apps/api/.dev.vars
pnpm install
pnpm --filter @aura/api db:migrate:local
pnpm --filter @aura/api db:seed:local
pnpm dev
```

Use Cloudflare's published Turnstile test keys locally. Automated tests mock email and X; they never send email or call live X APIs. The legacy `X-Aura-Dev-User` path is off by default, cannot run in production, is absent from normal web behavior, and may be enabled only for deliberate local diagnostics with `ENABLE_DEV_AUTH=1`.

To reset local D1, stop Wrangler, remove only `apps/api/.wrangler/state`, then rerun migration and seed commands. The seed preserves six fictional profiles and their Phase 3 posts, follows, likes, replies, reposts, and notifications, and migration 0003 creates corresponding AURA accounts.

## Authentication design

- Sessions contain 256 bits of random entropy. Only a SHA-256/pepper hash is stored in D1; the raw value exists only in an HttpOnly, SameSite=Lax cookie (Secure in production).
- Idle expiration is 14 days, rolls at most daily, and never exceeds the 30-day absolute lifetime. Sensitive changes require a session created within 15 minutes.
- Magic links expire after 15 minutes, are stored hashed, consumed atomically once, and land on a confirmation page whose explicit POST establishes the session. The request response is enumeration-resistant.
- X transactions expire after 10 minutes, use random hashed state and S256 PKCE. AURA requests only `tweet.read users.read`, keys identity by X subject ID, and discards the provider access token after reading the basic identity.
- Linking requires a recent AURA session. Identity conflicts never auto-merge accounts. The final verified sign-in method cannot be removed.
- Cookie mutations require an exact trusted Origin and a double-submit CSRF value matched to its D1 hash. Account ID comes only from the authenticated session.

## Abuse and media controls

Cloudflare Rate Limiting bindings provide shared limits: anonymous authentication 10/minute, authenticated mutations/uploads 120/minute, and search 60/minute. Keys are derived from a secret-peppered network, account, or normalized-email value; raw emails and IPs are not rate keys. Responses use a stable `RATE_LIMITED` error and `Retry-After`.

Turnstile is verified server-side for email login and email changes, including hostname and action when configured. Uploads allow JPEG, PNG, and WebP, enforce 5 MB avatars/8 MB banners and posts, verify magic bytes, block SVG/executable content, use safe generated names, and enter an R2 `pending/` prefix. Production fails closed unless `MEDIA_SCANNER` is bound and approves the file. Metadata stripping and malware scanning depend on that external implementation and are not claimed complete.

## API

Health: `GET /health`, `GET /ready`.

Authentication: `GET /v1/auth/session`, `POST /v1/auth/logout`, `POST /v1/auth/logout-all`, `GET /v1/auth/sessions`, `DELETE /v1/auth/sessions/:id`, `POST /v1/auth/email/request`, `POST /v1/auth/email/consume`, `GET /v1/auth/x/start`, `GET /v1/auth/x/callback`, `GET /v1/auth/x/link/start`, `GET /v1/auth/x/link/callback`, `DELETE /v1/auth/x/link`, `POST /v1/auth/email/change/request`, and `POST /v1/auth/email/change/confirm`.

Account: `POST /v1/account/delete/request`, `POST /v1/account/delete/cancel`. A daily Cron permanently anonymizes/deletes due AURA data after a 30-day cancellation period; it cannot delete public blockchain data.

Social: profile, follow, post, media, like, comment, repost, feed, explore, search, and notification routes under `/v1`. All mutations use prepared statements and centralized account/session authorization.

## Cloudflare production provisioning

Create distinct production/preview D1 and R2 resources, replace the explicit `<...>` placeholders in `apps/api/wrangler.jsonc`, configure Worker routes/custom domains, create Turnstile, verify the Resend sending domain, register the X OAuth callback, and bind an authenticated media scanner service.

```bash
wrangler d1 create aura-db
wrangler d1 create aura-db-preview
wrangler r2 bucket create aura-media
wrangler r2 bucket create aura-media-preview
pnpm --filter @aura/api db:migrate:remote
pnpm --filter @aura/api db:seed:local
wrangler secret put SESSION_TOKEN_PEPPER --config apps/api/wrangler.jsonc
wrangler secret put RESEND_API_KEY --config apps/api/wrangler.jsonc
wrangler secret put X_CLIENT_ID --config apps/api/wrangler.jsonc
wrangler secret put X_CLIENT_SECRET --config apps/api/wrangler.jsonc
wrangler secret put TURNSTILE_SECRET_KEY --config apps/api/wrangler.jsonc
pnpm --filter @aura/api deploy
pnpm --filter @aura/web deploy
```

Set non-secret `APP_ORIGIN`, `CORS_ORIGINS`, `X_REDIRECT_URI`, `AUTH_EMAIL_FROM`, optional `AUTH_EMAIL_REPLY_TO`, `TURNSTILE_EXPECTED_HOSTNAME`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Never commit real credentials.

After deployment: check `/health` and `/ready`; request and consume a real magic link; complete and unlink/relink X; verify cookies and CSRF rejection; create/revoke sessions; exercise a social mutation; upload a safe image through the scanner; confirm 429 behavior, logs/request IDs, Cron configuration, CORS/CSP, legal links, deletion cancellation, and alerting. Cloudflare Observability is enabled; configure Logpush/alerts and retention before launch. Logs contain request ID, route, status, latency, safe account ID, and security event—not tokens, codes, secrets, raw emails, or raw IPs.

## Verification

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter @aura/api exec wrangler deploy --dry-run
pnpm --filter @aura/web exec opennextjs-cloudflare build
git diff --check
```

## Launch limitations

The documents in `docs/legal` are initial operational drafts and require qualified counsel, including governing-law, contact, designated-agent, child/privacy, consumer, and liability decisions. Production also requires real Cloudflare IDs/domains, secrets, Resend and X approvals, a media scanner/metadata transformer, security monitoring and incident response, deletion/export operations, moderation/appeals staffing, accessibility review, and an independent security/privacy assessment.
