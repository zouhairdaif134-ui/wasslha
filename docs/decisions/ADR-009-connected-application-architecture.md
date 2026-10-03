# ADR-009 — Connected Application Architecture

## Status
Accepted

## Context

WASSLHA is a Berrechid-first local commerce and delivery platform with four application surfaces: Customer Mobile App, Rider Mobile App, Merchant Web/Tablet Dashboard, and Admin Web Dashboard.

The Master Product & Technical Specification requires these surfaces to operate as one connected system while keeping business rules, authorization, financial integrity, GPS/location controls, and auditability authoritative on the backend and database.

The MVP backend is a modular monolith exposed through versioned APIs under /api/v1. PostgreSQL/Supabase provides the persistent system of record and PostgreSQL RLS remains authoritative for data access.

## Decision

WASSLHA will use a **Backend-Centered Connected Application Architecture**.

No client application communicates directly with another client application for business operations. All cross-application business flows pass through the API and the authoritative database/security layer.

### Logical topology

```text
Customer App ─────┐
Merchant Dashboard ┼──► Cloudflare API ───► Supabase/PostgreSQL
Rider App ────────┤          │                    │
Admin Dashboard ──┘          ├──► Maps Service    ├── Auth
                             ├──► Notifications   ├── RLS
                             └──► Jobs/Webhooks    └── Storage
```

### Connection rules

1. **Customer** uses authenticated API calls for profile, addresses, marketplace discovery, orders, payments, tracking, wallet/growth/support features. Live rider location is exposed only under backend delivery/tracking rules.
2. **Merchant** uses authenticated API calls for merchant/store/product/order/settlement operations. Merchant ownership is resolved server-side. Order status changes use the authoritative order state machine.
3. **Rider** uses authenticated API calls for availability, slots, waiting list, assignments, pickup/delivery, location and earnings. Live location is limited to active service and controlled retention.
4. **Admin** uses authenticated API calls only. Admin 2FA and granular permissions govern operational, financial, support, governance and audit access. Sensitive settings require backend authorization, reason, before/after capture and audit logging.
5. **API** is the authoritative boundary for validation, authorization, business rules, state transitions, idempotency and sensitive operations. Service-role credentials never reach clients.
6. **Database** is the system of record. PostgreSQL RLS remains mandatory. Financial and audit records are not treated as destructively editable records.
7. **External services** such as Google Maps and Telegram remain integrations behind backend service boundaries and are never authoritative sources of order or financial state.

## Canonical business flow

```text
Customer → API → Order → Merchant → State Machine → Dispatch → Rider
                                                    │
                                      Pickup → Live Location → Delivery
                                                    │
                                                    ▼
                                      Payment → Commission → Earnings
                                                    │
                                                    └→ Merchant Settlement
```

The implementation must preserve the Master Specification's end-to-end traceability:

**Customer → Merchant → Rider → Pickup → Delivery → Payment → Commission → Rider Earnings → Merchant Settlement**

## Failure boundaries

- Sensitive client retries require idempotency.
- Payment callbacks/webhooks must be verified and processed safely.
- Invalid order transitions must be rejected.
- Dispatch must prevent duplicate active assignments.
- Financial operations must execute transactionally.
- Notification failure must not silently corrupt authoritative business state.
- External map/notification providers are dependencies, not sources of truth.

## Environment isolation

Development, Staging and Production are isolated. Each environment uses its own database/project configuration, credentials, external-service credentials and client configuration.

Production data and credentials must never be mixed with development or staging.

## Security boundary

```text
Client
  ↓
HTTPS
  ↓
Authentication
  ↓
Request Context
  ↓
Granular RBAC
  ↓
Backend Validation / Business Rules
  ↓
PostgreSQL RLS
  ↓
Authoritative Data
  ↓
Audit / Financial Integrity
```

Passing one layer does not remove the requirements of the following layer.

## Consequences

### Positive

- One authoritative business path across all applications.
- No client-to-client trust relationship.
- Centralized order, finance, dispatch and security rules.
- Clear failure boundaries.
- Supports the modular-monolith MVP while preserving future scale-out options.

### Trade-offs

- The API is a critical dependency and must be monitored.
- Realtime behavior requires deliberate event/notification design.
- Integration tests must cover cross-application flows.
- External providers require timeout, retry and failure handling.

## Acceptance criteria

The architecture is considered implemented only when:

- Customer, Merchant, Rider and Admin clients authenticate against the same environment-specific identity boundary.
- Protected API routes enforce the correct role/permission.
- PostgreSQL RLS protects data at the database layer.
- Order state changes use the state machine.
- Payment/finance operations remain traceable through the ledger.
- Rider dispatch/tracking follows GPS rules.
- Merchant settlement and rider earnings can be reconciled from authoritative records.
- External integrations cannot become a second source of truth.
- Development, staging and production are isolated.
- The critical end-to-end flow is covered by integration/E2E testing before production launch.
