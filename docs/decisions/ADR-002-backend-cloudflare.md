ADR-002: Backend on Cloudflare Workers

Status

Accepted

Date

2026-09

Context

WASSLHA requires a backend API responsible for:

- Authentication-related server operations
- Authorization
- Business rules
- Order state transitions
- Delivery and dispatch
- Financial operations
- Wallet operations
- Payment processing
- Notifications
- Administrative operations

The backend must support the Berrechid MVP while remaining suitable for future expansion.

Decision

WASSLHA will use Cloudflare Workers as the backend API platform.

The backend will initially use a modular monolith architecture.

The primary API entry point will be:

"/api/v1/"

The Worker application is:

"wasslha-api"

Backend Architecture

The backend will be organized into logical modules:

1. Auth
2. Users
3. Merchants
4. Stores
5. Products
6. Orders
7. Delivery
8. Riders
9. Slots
10. Payments
11. Wallets
12. Promotions
13. Reviews
14. Support
15. Notifications
16. Admin

These modules remain part of the same backend application during the MVP.

Reasons

Cloudflare Workers provides:

- Server-side execution close to users.
- Suitable infrastructure for API workloads.
- Integration with the Cloudflare deployment environment.
- Scalable request handling.
- Secure server-side handling of secrets.
- A suitable foundation for webhooks and background processing.

The modular monolith avoids unnecessary microservice complexity during the initial MVP.

Security

The backend is an authoritative security boundary.

It must enforce:

- Authentication
- Authorization
- RBAC
- Granular permissions
- Input validation
- Business rules
- Idempotency where required
- Rate limiting where required
- Audit logging

Client-side validation must never be treated as a security boundary.

Database Integration

The backend will use Supabase PostgreSQL as the persistent data layer.

Database access must respect the defined RLS architecture.

Server-side operations that require elevated privileges must be explicitly authorized and audited where applicable.

Financial Operations

Financial operations must be handled through controlled backend operations.

The backend must preserve:

- Ledger integrity
- Idempotency
- Transactional consistency
- Reversals
- Adjustments
- Refunds
- Settlement records

Direct production database edits are not an accepted financial correction mechanism.

API Versioning

The initial API version is:

"v1"

Breaking changes require a new API version rather than silently changing an existing contract.

Deployment

The backend is deployed through Cloudflare.

The three environments are isolated:

- Development
- Staging
- Production

Each environment uses its own configuration and secrets.

Alternatives Considered

Traditional Dedicated Server

A traditional server-based backend could provide full infrastructure control but would introduce additional infrastructure and operational management for the MVP.

Microservices

Microservices were not selected for the initial MVP because they would introduce unnecessary operational complexity.

The modular monolith provides clear module boundaries while keeping deployment and development simpler.

Consequences

Positive

- One backend deployment.
- Clear domain modules.
- Lower operational complexity.
- Easier cross-module transactions.
- Suitable foundation for the MVP.
- Can evolve into separate services later if required.

Negative

- Modules share the same deployment boundary.
- Poor module boundaries could create coupling.
- Large backend changes require careful testing.

Future Evolution

If WASSLHA grows to a scale where independent services become justified, individual modules may be extracted into separate services.

Such a change requires a new Architecture Decision Record.

Review Condition

This decision should be reviewed if:

- Backend scale changes substantially.
- Independent service scaling becomes necessary.
- Team structure requires service ownership.
- Security boundaries require service separation.
- Cloudflare Worker constraints materially affect the platform.

Any change must be documented through a new ADR.
