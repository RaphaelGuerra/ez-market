# EZ Market MVP

API-first modular monolith for automated multi-market grocery ordering.

## Stack

- Node.js 22 + TypeScript
- Fastify API + BullMQ workers
- PostgreSQL 16 + Prisma ORM
- Redis queue backend
- Mock API + scraping connectors for MVP

## Implemented Modules

- `auth`: register/login/verify
- `users`: profile + default delivery address
- `markets`: market account link/refresh/delete (encrypted credentials)
- `catalog`: curated staples search
- `cart`: add/update items, get active cart
- `pricing`: quote generation across active connectors
- `optimizer`: split-cart optimization by total cost (items + fees + tax estimate)
- `checkout`: prepare + explicit approval + idempotency + reprice guardrail
- `orders`: list/get/cancel, leg-level status
- `admin`: connector policies + kill-switch controls
- `notifications`: audit-backed notification stub
- worker roles: checkout execution + ingestion/optimization/connector/reconciliation placeholders

## Quick Start

1. Install deps

```bash
npm install
```

2. Start infra

```bash
docker compose up -d
```

3. Configure env

```bash
cp .env.example .env
```

4. Generate Prisma client and push schema

```bash
npm run prisma:generate
npm run prisma:push
```

5. Seed catalog and connector policies

```bash
npm run seed
```

6. Run API + workers

```bash
npm run dev
npm run worker
```

7. Open web MVP console

- [http://localhost:3000/app](http://localhost:3000/app)

## Required API Surface

Implemented endpoints:

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
- `POST /v1/checkout/approve`
- `GET /v1/orders/:id`
- `GET /v1/orders/`
- `POST /v1/orders/:id/cancel`
- `GET /v1/admin/connectors`
- `POST /v1/admin/connectors/:market/kill-switch`

## Notes

- MVP is constrained to one city (`CITY_NAME` + geofence env settings).
- Delivery-only logic.
- Explicit final approval is mandatory before order execution.
- Payment storage is token reference only (`payment_method_refs`).
- Connector compliance controls include per-market kill-switch.
- Admin endpoints require `User.role = ADMIN`.

## Test

```bash
npm test
```
