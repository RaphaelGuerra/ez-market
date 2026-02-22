# EZ Market Agent Guide

This file is the quick entrypoint for coding agents working in this repository.

## Current Product State

- This is an API-first Cloudflare Worker app for automated grocery ordering.
- Runtime is `Hono + TypeScript + D1 + Cloudflare Queues`.
- Checkout execution endpoint is intentionally disabled in HTTP phase 1:
  - `POST /v1/checkout/approve` returns `503` with `CHECKOUT_EXECUTION_UNAVAILABLE`.
- Background checkout execution exists in the queue consumer (`src/queue/checkout-consumer.ts`) and is wired in the Worker `queue()` handler.

## Start Here (Read Order)

1. `README.md` for top-level setup.
2. `docs/architecture.md` for system design and request/queue flows.
3. `docs/api-workflows.md` for endpoint sequencing and integration contracts.
4. `docs/environment-runbook.md` for local/dev/prod operational commands.

## High-Signal Repo Map

- `src/worker/index.ts`: Worker `fetch` + queue consumer entrypoint.
- `src/worker/app.ts`: route registration and global error/notFound handling.
- `src/http/routes/*.ts`: all HTTP endpoints (auth, users, markets, catalog, cart, pricing, optimizer, checkout, orders, admin).
- `src/http/middleware/auth.ts`: bearer JWT auth guard.
- `src/modules/pricing/pricing.service.ts`: quote generation using enabled connectors.
- `src/modules/optimizer/optimizer.service.ts`: split-cart optimization logic.
- `src/queue/checkout-consumer.ts`: async order leg execution and status transitions.
- `src/connectors/*.ts`: market connector implementations and registry.
- `src/db/repositories/*.ts`: all DB access (D1 SQL repository pattern).
- `d1/schema.sql`: canonical schema.
- `d1/seed.sql`: base seed data for catalog + connector policies.
- `tests/*.test.ts`: runtime and core service tests.

## Runtime Contracts

- Required secrets:
  - `JWT_SECRET` (min 16 chars)
  - `ENCRYPTION_KEY` (min 24 chars)
- Core env vars parsed in `src/worker/config.ts`:
  - `CITY_NAME`, `CITY_LAT`, `CITY_LON`, `CITY_RADIUS_KM`
  - `APPROVAL_BUNDLE_TTL_MIN`
  - `MAX_MARKETS_PER_ORDER`
  - `DEFAULT_MAX_PRICE_DELTA_PCT`
- `wrangler.toml` defines:
  - D1 binding: `DB`
  - Queue binding: `CHECKOUT_QUEUE`
  - Assets binding: `ASSETS` serving `web/`

## Agent Working Conventions

- Keep module boundaries intact:
  - HTTP orchestration in `src/http/routes`.
  - business logic in `src/modules`.
  - persistence in `src/db/repositories`.
- For new features, prefer this sequence:
  1. Schema and repository updates.
  2. Service logic.
  3. Route handler.
  4. Tests.
  5. Docs updates.
- Preserve audit logging for state-changing operations.
- Preserve auth on protected routes (`requireAuth`).
- For write endpoints with retry risk, consider idempotency key handling pattern from `checkout.prepare`.
- Do not remove phase-1 guard behavior on `/v1/checkout/approve` unless explicitly requested.

## Fast Validation

- Type/lint check: `npm run lint`
- Tests: `npm test`
- Local worker: `npm run cf:dev`

