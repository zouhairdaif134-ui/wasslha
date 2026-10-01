WASSLHA Roadmap

Source of Truth

This roadmap follows the official:

WASSLHA Master Product & Technical Specification v1.0

The roadmap must not introduce product requirements that are outside the approved specification.

Phase 1 — Specification Freeze

Objectives

- Confirm the product scope.
- Confirm Berrechid as the initial service area.
- Freeze the approved MVP requirements.
- Record approved architectural decisions.

Result

The Master Specification becomes the reference point for implementation decisions.

Phase 2 — Architecture and Security

Objectives

- Confirm monorepo architecture.
- Confirm environment separation.
- Define authentication and authorization.
- Define RBAC and granular permissions.
- Define RLS strategy.
- Define secrets management.
- Define audit requirements.
- Define GPS privacy controls.

Result

A secure technical foundation ready for database implementation.

Phase 3 — Database Schema and Migrations

Objectives

Implement the database domains defined by the specification:

1. Identity
2. Commerce
3. Orders
4. Delivery
5. Riders
6. Finance
7. Growth
8. Communication
9. Support and Governance
10. Get Request

Requirements

- Version-controlled migrations.
- Foreign-key integrity.
- Appropriate indexes.
- RLS policies.
- Audit structures.
- Financial integrity.
- Private storage for sensitive documents.

Result

A tested database foundation for the platform.

Phase 4 — Backend Core and Authentication

Objectives

Build the Cloudflare Workers backend.

Initial areas include:

- API foundation
- Authentication
- Users
- Roles
- Permissions
- Core validation
- Error handling
- API versioning
- Rate limiting
- Idempotency support

Result

A secure "/api/v1/" backend foundation.

Phase 5 — Admin Dashboard Foundation

Objectives

Build the Admin Dashboard.

Initial areas include:

- Admin authentication
- Dashboard shell
- Users
- Merchants
- Riders
- Permissions
- Audit visibility
- Operational configuration

Result

Admins can securely monitor and manage the platform foundation.

Phase 6 — Merchant Dashboard

Objectives

Build merchant operations:

- Store profile
- Store status
- Opening and closing
- Pause orders
- Products
- Product availability
- Orders
- Earnings
- Settlements
- Merchant profile

Result

Approved merchants can operate their stores through the platform.

Phase 7 — Rider App, Slots and Dispatch

Objectives

Build:

- Rider authentication
- Rider profile
- Approval status
- Availability
- Slots
- Waiting list
- Performance
- Earnings
- Bonuses
- Delivery assignments
- GPS location
- Dispatch

Result

Approved riders can receive and complete delivery services.

Phase 8 — Customer App and Marketplace

Objectives

Build:

- Customer authentication
- Home
- Search
- Store browsing
- Categories
- Products
- Cart
- Checkout
- Saved addresses
- GPS
- Order tracking
- Orders
- Profile

Result

Customers can discover stores, place orders and track eligible deliveries.

Phase 9 — "جيب ليا"

Objectives

Implement the request service:

- Request creation
- Pickup location
- Delivery address
- Budget
- Request type
- Rider assignment
- Buying or pickup
- Receipt capture
- Budget approval
- Delivery
- Request history

Result

Customers can request pickup or purchase from locations outside the registered marketplace.

Phase 10 — Payments, Wallets and Ledger

Objectives

Implement:

- Cash on Delivery
- Online payment
- Delivery fees
- Service fees
- Merchant commissions
- Rider earnings
- Wallets
- Refunds
- Reversals
- Adjustments
- Merchant settlements
- Ledger
- Reconciliation

Result

Every financial movement is traceable and auditable.

Phase 11 — Notifications, Reviews and Support

Objectives

Implement:

- Notifications
- Notification events
- Reviews
- Complaints
- Refund requests
- Support workflows
- Operational alerts

Result

The core platform has communication, feedback and support capabilities.

Phase 12 — Integration and Security Testing

Objectives

Complete:

- Unit tests
- Integration tests
- API tests
- RLS tests
- Security tests
- Payment tests
- GPS tests
- Order-flow tests
- Concurrency tests
- Recovery tests
- End-to-end tests

Critical Flow

"Customer → Order → Merchant → Rider → Pickup → Delivery → Payment → Commission → Rider Earnings → Merchant Settlement"

Result

The complete MVP is validated across its critical workflows.

Phase 13 — Berrechid Pilot

Objectives

Launch a controlled pilot in Berrechid.

Validate:

- Customer onboarding
- Merchant onboarding
- Rider operations
- GPS and dispatch
- Orders
- Payments
- Settlements
- Support
- Notifications
- Operational performance

Result

Real-world pilot feedback and verified operational readiness.

Phase 14 — Production Launch

Requirements

Production launch requires:

- Security acceptance
- RLS acceptance
- Financial reconciliation
- Backup and restore validation
- End-to-end acceptance
- Monitoring
- Rollback procedures
- Production secrets
- Operational readiness

Result

WASSLHA becomes operational for the approved Berrechid MVP scope.

Future Expansion

After the Berrechid MVP is validated, the architecture must support expansion without rebuilding the platform.

Potential expansion areas must be evaluated through the specification and formal decisions before implementation.

No new feature or city should be added merely because it appears useful.

Roadmap Principle

Implementation follows:

"Specification → Architecture → Database → Security → Backend → Dashboards → Apps → Integrations → Testing → Pilot → Production"
