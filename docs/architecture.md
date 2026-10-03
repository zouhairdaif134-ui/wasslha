WASSLHA Architecture

## Connected Application Architecture

WASSLHA uses a backend-centered connected application model for the Berrechid MVP.

Customer App, Rider App, Merchant Dashboard and Admin Dashboard do not communicate directly with each other for business operations. They communicate through the versioned Cloudflare Workers API, which uses Supabase/PostgreSQL as the authoritative system of record.

```text
Customer App ─────┐
Merchant Dashboard ┼──► Cloudflare API ───► Supabase/PostgreSQL
Rider App ────────┤          │                    │
Admin Dashboard ──┘          ├──► Maps Service    ├── Auth
                             ├──► Notifications   ├── RLS
                             └──► Jobs/Webhooks    └── Storage
```

## System Components

- GitHub — source control and repository
- Supabase — PostgreSQL, Auth, RLS and Storage
- Cloudflare Workers — Backend API and webhooks
- Cloudflare Pages — Admin and Merchant dashboards
- React Native + Expo — Customer and Rider mobile apps
- Google Maps Platform — GPS, routes, distance and ETA through the backend Maps service layer
- Telegram — operational notifications and alerts

## Canonical Order Flow

Customer → Merchant → Rider → Pickup → Delivery → Payment → Commission → Rider Earnings → Merchant Settlement

The API owns authentication context, authorization, backend validation, business rules, order state transitions, sensitive operations and integration orchestration. PostgreSQL RLS remains authoritative after API authorization.

## Application Responsibilities

### Customer App
Marketplace discovery, addresses/location, ordering, payment, tracking, wallet/growth and support.

### Merchant Dashboard
Merchant/store/product operations, order handling and preparation, earnings and settlement visibility.

### Rider App
Availability, slots/waiting list, assignments, navigation, pickup/delivery, controlled live location and earnings.

### Admin Dashboard
Operations, users, merchants, riders, finance, support, reports, governance/settings and audit visibility according to granular permissions.

## Security and Reliability

- Service-role credentials never reach clients.
- Sensitive operations require idempotency.
- Order status changes use the authoritative state machine.
- Financial records use integer minor units in MAD and reversal/adjustment semantics rather than destructive deletion.
- Audit records are append-only.
- Live rider location is limited to active service and controlled retention.
- External providers are integrations, not sources of truth.
- Development, Staging and Production are isolated.

## Architectural Decision

See docs/decisions/ADR-009-connected-application-architecture.md for the detailed connected-system contract and acceptance criteria.
