# EZ Market MVP (Cloudflare Workers)

Last updated: 2026-03-05

## Table of Contents

<!-- TOC start -->
- [Stack](#stack)
- [Implemented Modules](#implemented-modules)
- [Cloudflare Setup](#cloudflare-setup)
- [Local Preview](#local-preview)
- [Deploy](#deploy)
- [API Surface](#api-surface)
- [Documentation for Agents](#documentation-for-agents)
- [Test](#test)
<!-- TOC end -->

API-first modular monolith for automated multi-market grocery ordering, now running on Cloudflare Workers + D1.

## Stack

- Cloudflare Workers + TypeScript + Hono
- D1 (SQLite) for app data
- Cloudflare Queues for checkout execution pipeline
- Static `web/` assets served via Worker assets binding
- Mock API + scraping connectors for MVP

## Implemented Modules

- `auth`: register/login/verify
- `users`: profile + default delivery address
- `markets`: market account link/refresh/delete (encrypted credentials)
- `catalog`: curated staples search
- `cart`: add/update items, get active cart
- `pricing`: quote generation across active connectors
- `optimizer`: split-cart optimization by total cost (items + fees + tax estimate)
- `checkout`: prepare works, `approve` is feature-gated with `503` in phase 1
- `orders`: list/get/cancel
- `admin`: connector policies + kill-switch controls

## Cloudflare Setup

1. Install dependencies

```bash
npm install
```

2. Create D1 databases

```bash
wrangler d1 create ez-market-dev
wrangler d1 create ez-market-prod
```

3. Create queues

```bash
wrangler queues create ez-market-checkout-dev
wrangler queues create ez-market-checkout-prod
```

4. Update `wrangler.toml` with generated D1 IDs.

5. Set secrets per environment

```bash
wrangler secret put JWT_SECRET --env dev
wrangler secret put ENCRYPTION_KEY --env dev
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
```

6. Apply schema + seed

```bash
npm run db:apply:dev
npm run db:seed:dev
npm run db:apply:prod
npm run db:seed:prod
```

## Local Preview

```bash
npm run db:apply:local
npm run db:seed:local
npm run cf:dev
```

## Deploy

```bash
npm run cf:deploy:dev
npm run cf:deploy:prod
```

## API Surface

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/verify`
- `GET /v1/users/me`
- `PATCH /v1/users/me`
- `POST /v1/users/me/address`
- `POST /v1/markets/accounts/link`
- `POST /v1/markets/accounts/:id/refresh`
- `DELETE /v1/markets/accounts/:id`
- `GET /v1/catalog/search?q=&city=`
- `POST /v1/cart/items`
- `GET /v1/cart/`
- `POST /v1/pricing/quote`
- `POST /v1/optimizer/plan`
- `POST /v1/checkout/prepare`
- `POST /v1/checkout/approve` (phase 1: returns `503`)
- `GET /v1/orders/:id`
- `GET /v1/orders/`
- `POST /v1/orders/:id/cancel`
- `GET /v1/admin/connectors`
- `POST /v1/admin/connectors/:market/kill-switch`

## Documentation for Agents

- `AGENTS.md`: quick start for coding agents (repo map, constraints, conventions).
- `docs/README.md`: docs index.
- `docs/architecture.md`: runtime architecture and data/control flow.
- `docs/api-workflows.md`: API request sequencing and integration contracts.
- `docs/environment-runbook.md`: local/dev/prod setup and troubleshooting commands.

## Test

```bash
npm test
```
