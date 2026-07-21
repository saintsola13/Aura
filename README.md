# AURA

A production-oriented foundation for a public-address digital identity product, built as a pnpm/Turborepo monorepo and deployed entirely on Cloudflare.

## Phase 3

AURA now provides a functional development social experience for NFT culture and internet-native communities:

- editable and public profiles with avatar/banner media;
- manual, unverified public wallet-address references;
- follows, follower/following lists, and chronological following feeds;
- text posts, one-image posts, replies, reposts, likes, and mentions;
- recent-post explore, people search, post detail, and notifications;
- responsive desktop and mobile navigation; and
- deterministic demo data plus shared domain validation tests.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind CSS 4, and the App Router
- Hono REST API on Cloudflare Workers
- Cloudflare D1 for profiles and R2 for avatar objects
- OpenNext for deploying Next.js to Cloudflare Workers
- Shared UI and domain contracts through workspace packages

## Repository layout

```text
apps/web        Next.js landing page and public-address entry client
apps/api        Hono Worker, D1 migrations, and R2 integration
packages/ui     Shared React primitives
packages/shared Shared domain models and validation helpers
docs            Product white paper and long-form documentation
```

## Local development

Prerequisites: Node.js 20+ and pnpm 10.

```bash
cp .env.example .env.local
pnpm install
pnpm --filter @aura/api db:migrate:local
pnpm --filter @aura/api db:seed:local
pnpm dev
```

The web app runs at `http://localhost:3000`; Wrangler normally starts the API at `http://localhost:8787`. Open `/home`, select a visibly labeled Development session user, and use the seeded social graph. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` to verify all workspaces.

### Resetting local D1

Wrangler stores local state under `apps/api/.wrangler/state`. To reset, stop local processes, remove that local-only directory, then rerun the migration and seed commands above. The seed is idempotent and creates six fictional users, 22 posts (including comments and reposts), 12 follow relationships, 12 likes, and five notifications.

## Development session model

Phase 3 intentionally does not pretend wallet lookup is authentication. The development user switcher stores a selected demo user ID in local storage and sends it as `X-Aura-Dev-User`. The API validates the ID against D1 only when `ENVIRONMENT` is not `production`. In production, mutation requests using this temporary mechanism are rejected.

This is not secure authentication and must not be exposed as one. The API isolates session resolution from domain operations so a real cookie/token-backed, non-wallet session can replace it later. Production authentication, CSRF strategy, distributed rate limiting, abuse operations, and authorization review remain required before enabling production mutations.

## Wallet identification and safety

AURA identifies profiles only by a manually pasted public Ethereum address. The normalized address is stored in the browser's local storage and can be changed or removed at any time. AURA does not connect to wallet software and never requests seed phrases, private keys, wallet permissions, transaction approvals, or message signatures.

Public-address identification is not proof of wallet ownership. Phase 3 mutations are available only through the temporary non-production development session; use an appropriate non-wallet account authentication system before enabling user mutations in production.

## D1 migrations and R2 media

- `0001_initial.sql` creates the original profile foundation.
- `0002_social_graph.sql` rebuilds the profile model and adds posts, follows, likes, notifications, foreign keys, constraints, and feed indexes.
- `seed/development.sql` supplies deterministic local demo content and is not an automatic production migration.

Avatar uploads are limited to 5 MB. Banners and post images are limited to 8 MB. Only JPEG, PNG, and WebP are accepted. Objects use generated user-scoped keys, retain content types and cache metadata, replace prior profile assets cleanly, and are served through `GET /v1/media/*`. Failed post creation removes an uploaded object; deleting a post removes its media object.

## Cloudflare setup

Authenticate Wrangler, then create the backing resources:

```bash
wrangler login
wrangler d1 create aura-db
wrangler r2 bucket create aura-avatars
wrangler r2 bucket create aura-avatars-dev
```

Copy the returned D1 ID into `apps/api/wrangler.jsonc`, then apply and deploy:

```bash
pnpm --filter @aura/api db:migrate:remote
pnpm --filter @aura/api deploy
pnpm --filter @aura/web deploy
```

Set `NEXT_PUBLIC_API_URL` for the web build to the deployed API URL, and update `CORS_ORIGINS` in the API Worker to the production web origin. For CI deployment, store `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as repository secrets.

## API

- `GET /health`
- `GET /v1/dev/users` (development only)
- `GET /v1/profiles/:username`
- `PUT /v1/me/profile`
- `POST|DELETE /v1/me/avatar`
- `POST|DELETE /v1/me/banner`
- `GET /v1/users/search?q=`
- `POST|DELETE /v1/profiles/:username/follow`
- `GET /v1/profiles/:username/followers`
- `GET /v1/profiles/:username/following`
- `POST /v1/posts`
- `GET|DELETE /v1/posts/:id`
- `GET /v1/profiles/:username/posts`
- `GET /v1/feed`
- `GET /v1/explore`
- `POST|DELETE /v1/posts/:id/like`
- `POST|GET /v1/posts/:id/comments`
- `POST|DELETE /v1/posts/:id/repost`
- `GET /v1/notifications`
- `POST /v1/notifications/read-all`
- `POST /v1/notifications/:id/read`
- `GET /v1/media/*`

All SQL inputs use prepared D1 statements. User post text is rendered as text, never HTML. CORS is allowlisted, secure headers are enabled, images are byte- and MIME-limited, and mutation categories pass through a development-friendly isolate-local rate-limit abstraction. Production should replace that abstraction with Cloudflare's distributed Rate Limiting or Durable Objects and complete a formal threat/abuse review.
