# AURA

A production-oriented foundation for a wallet-native digital identity product, built as a pnpm/Turborepo monorepo and deployed entirely on Cloudflare.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind CSS 4, and the App Router
- Hono REST API on Cloudflare Workers
- Cloudflare D1 for profiles and R2 for avatar objects
- OpenNext for deploying Next.js to Cloudflare Workers
- Shared UI and domain contracts through workspace packages

## Repository layout

```text
apps/web        Next.js landing page and wallet client
apps/api        Hono Worker, D1 migrations, and R2 integration
packages/ui     Shared React primitives
packages/shared Shared domain models and validation helpers
```

## Local development

Prerequisites: Node.js 20+ and pnpm 10.

```bash
cp .env.example .env.local
pnpm install
pnpm --filter @aura/api db:migrate:local
pnpm dev
```

The web app runs at `http://localhost:3000`; Wrangler normally starts the API at `http://localhost:8787`. `pnpm typecheck` and `pnpm build` verify all workspaces.

## Wallet authentication

The web package includes an EIP-1193 connection scaffold and responds to account changes. Connecting a wallet is not authentication by itself. Before protecting profile mutations, add a nonce endpoint, require an EIP-4361 (Sign-In with Ethereum) signature, verify it in the Worker, and issue a short-lived secure session. The current profile write routes are intentionally scaffolding and must not be treated as authorization-protected.

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
- `GET /v1/profiles/:wallet`
- `PUT /v1/profiles/:wallet`
- `PUT /v1/profiles/:wallet/avatar`
- `GET /v1/avatars/:wallet`

Profile responses use the shared `UserProfile` contract. Images are limited to JPEG, PNG, or WebP under 5 MB.
