# API Workflows

This document captures the intended request sequence and key endpoint contracts.

## Authentication Flow

1. `POST /v1/auth/register`
2. `POST /v1/auth/verify` (MVP code is `123456`)
3. `POST /v1/auth/login`
4. Use bearer token on all protected routes:
   - `Authorization: Bearer <jwt>`

Notes:

- JWT payload includes `userId`, `email`, and `exp`.
- Protected routes return `401` when token is missing or invalid.

## Core User Setup Flow

1. `PATCH /v1/users/me` (optional profile tuning)
2. `POST /v1/users/me/address` (required for pricing/checkout flows)
3. `POST /v1/markets/accounts/link` for each market account
4. `POST /v1/markets/accounts/:id/refresh` when session/credential refresh is needed

Constraints:

- Address city must match configured city (`CITY_NAME`).
- Market account link checks connector policy (`enabled`, `killSwitchEnabled`).

## Cart to Quote to Plan Flow

1. `GET /v1/cart/` to get active cart
2. `POST /v1/cart/items` to add/update line items
3. `POST /v1/pricing/quote`
4. `POST /v1/optimizer/plan`

Pricing preconditions:

- Cart has at least one item.
- User has a default address in supported city radius.
- At least one connector is enabled and not kill-switched.

Optimizer behavior:

- Picks cheapest in-stock offer per item.
- Limits number of markets using `MAX_MARKETS_PER_ORDER`.
- Persists plan with 10-minute expiry.

## Checkout Preparation Flow

1. `POST /v1/checkout/prepare` with `optimizationPlanId`
2. Optionally pass `x-idempotency-key` header for safe retries

Returns:

- Approval bundle id, status, quote hash, expiry, totals, and plan legs.

Failure modes:

- `404` when plan missing
- `409` when plan expired

## Checkout Approval (Phase 1 Guard)

- `POST /v1/checkout/approve` currently always returns:
  - `503`
  - `Retry-After: 120`
  - code `CHECKOUT_EXECUTION_UNAVAILABLE`

Background queue execution path is implemented but not enabled through this route yet.

## Order Management

- `GET /v1/orders/` list orders (optional status filter)
- `GET /v1/orders/:id` fetch one order
- `POST /v1/orders/:id/cancel` cancel if status allows

Cancel guard:

- Cannot cancel when status is `COMPLETED`, `FAILED`, or `CANCELED`.

## Admin Operations

All `/v1/admin/*` routes require authenticated user role `ADMIN`.

- `GET /v1/admin/connectors`
- `POST /v1/admin/connectors/:market/kill-switch`

Kill-switch endpoint updates connector availability used by pricing and market link operations.

