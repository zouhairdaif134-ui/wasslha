WASSLHA API

Base Path

All application API endpoints use:

"/api/v1/"

Backend

The WASSLHA backend runs as a modular monolith on Cloudflare Workers.

The backend is the authoritative layer for:

- Authentication-related server operations
- Authorization
- Business rules
- Order state transitions
- Delivery and dispatch logic
- Financial operations
- Wallet operations
- Payment processing
- Notifications
- Administrative operations

Main API Modules

The API is organized into modules:

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

API Principles

- Backend validation is mandatory.
- Client-side validation is not a security boundary.
- Protected endpoints require authentication and authorization.
- Sensitive operations require idempotency where applicable.
- Pagination must be used for large collections.
- Errors must use consistent response structures.
- Business rules must be configurable where required.
- Order status changes must follow the defined state machine.

Security

API access must respect:

- RBAC
- Granular permissions
- PostgreSQL RLS
- Rate limiting where required
- Secure secret management
- Audit logging for sensitive administrative actions

Financial Operations

Financial endpoints must preserve ledger integrity.

No financial operation may silently overwrite historical records.

Corrections must use explicit reversal or adjustment operations.

Versioning

The initial API version is:

"v1"

Breaking API changes require a new version rather than silently changing existing contracts.
