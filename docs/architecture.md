# Architecture

## System Overview

EZ Market is a modular monolith running on Cloudflare Workers.

- HTTP runtime: `Hono` app from `src/worker/app.ts`
- Background runtime: queue consumer in `src/worker/index.ts` -> `processCheckoutJob`
- Persistence: Cloudflare D1 (SQLite), schema in `d1/schema.sql`
- Connectors: in-process providers (`market_api`, `market_scrape`) from `src/connectors`
- Static app assets: served through `ASSETS` binding for non-`/v1/*` routes

## Runtime Entry Points

### HTTP (`fetch`)

1. Request enters Worker `fetch()`.
2. Routed through Hono app.
3. Route handlers call repositories/services.
4. JSON response returned (or static asset fallback outside `/v1/*`).

### Queue (`queue`)

1. Message arrives on `CHECKOUT_QUEUE`.
2. Payload validated (`orderId`, `userId`, `paymentTokenRef`, `enqueuedAtIso`).
3. `processCheckoutJob` executes each order leg using market connector.
4. Order leg + order statuses are updated.
5. Audit log + user notifications are emitted.

## Layering Model

- `src/http/*`
  - Request parsing, auth guard, response shaping.
- `src/modules/*`
  - Cross-route business logic (pricing, optimization, notifications).
- `src/db/repositories/*`
  - SQL access and row mapping.
- `src/utils/*`
  - Shared helpers (crypto, idempotency, geo, logging, hashing).

## Data Model Highlights

Core entities:

- Users + addresses (`users`, `user_addresses`)
- Market account credentials (`market_accounts`) encrypted with AES-GCM helper
- Cart + items (`carts`, `cart_items`)
- Catalog + SKU mapping (`catalog_items`, `market_skus`, `product_mappings`)
- Price snapshots (`offer_snapshots`)
- Optimization planning (`optimization_plans`, `plan_legs`)
- Checkout approval bundle (`approval_bundles`)
- Orders + legs + events (`orders`, `order_legs`, `order_events`)
- Operational controls (`connector_policies`, `connector_health`)
- Cross-cutting (`audit_logs`, `idempotency_keys`)

## Operational Controls

- Connector availability is policy-driven from DB:
  - `enabled` and `kill_switch_enabled` gates market access.
- Pricing only queries connectors with active policy.
- Market account failures can transition account status to `REAUTH_REQUIRED`.

## Known Product Constraints (Current)

- City support is restricted to configured city (`CITY_NAME`, default San Francisco).
- Quote generation fails without:
  - active cart items
  - default address
  - at least one enabled connector
- Checkout approval endpoint is feature-gated (`503`); queue execution logic exists for migration stage.

