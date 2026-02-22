# Environment Runbook

## Prerequisites

- Node.js `>=22` (from `package.json`)
- npm
- Cloudflare account + Wrangler CLI auth

Install:

```bash
npm install
```

## Local Development

Apply and seed local D1:

```bash
npm run db:apply:local
npm run db:seed:local
```

Run Worker locally:

```bash
npm run cf:dev
```

## Cloud Environments

Create D1 DBs (once):

```bash
wrangler d1 create ez-market-dev
wrangler d1 create ez-market-prod
```

Create queues (once):

```bash
wrangler queues create ez-market-checkout-dev
wrangler queues create ez-market-checkout-prod
```

Set secrets:

```bash
wrangler secret put JWT_SECRET --env dev
wrangler secret put ENCRYPTION_KEY --env dev
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
```

Apply schema + seed:

```bash
npm run db:apply:dev
npm run db:seed:dev
npm run db:apply:prod
npm run db:seed:prod
```

Deploy:

```bash
npm run cf:deploy:dev
npm run cf:deploy:prod
```

## Validation Commands

Type/lint:

```bash
npm run lint
```

Test:

```bash
npm test
```

## Agent Change Checklist

When implementing features or fixes:

1. Confirm route-level auth and role checks.
2. Keep state transitions explicit and persisted (order/order_leg/approval statuses).
3. Add or update audit logs for mutating operations.
4. Add tests for behavior changes.
5. Update docs in `AGENTS.md` or `docs/*` when contracts change.

## Common Failure Triage

- `401 Unauthorized`:
  - Missing/invalid bearer token or wrong `JWT_SECRET`.
- Quote generation `400`:
  - Empty cart, missing default address, out-of-city address, or no enabled connectors.
- Market link `403`:
  - Connector policy disabled or kill switch enabled.
- Checkout approve `503`:
  - Expected current behavior in phase 1.

