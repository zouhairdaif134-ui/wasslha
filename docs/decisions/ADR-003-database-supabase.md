ADR-003: Database on Supabase PostgreSQL

Status

Accepted

Date

2026-09

Context

WASSLHA requires a relational database for:

- Users and roles
- Merchants and stores
- Products
- Orders
- Delivery operations
- Riders and slots
- Payments
- Wallets
- Ledger and settlements
- Promotions
- Reviews
- Notifications
- Support
- "جيب ليا" requests
- Audit records

The platform also requires strong data integrity, Row Level Security (RLS), migrations and transactional financial operations.

Decision

WASSLHA will use PostgreSQL through Supabase as its primary database platform.

Three isolated Supabase projects will be used:

- "wasslha-development"
- "wasslha-staging"
- "wasslha-production"

Reasons

Supabase PostgreSQL provides the relational database capabilities required by WASSLHA, including:

- PostgreSQL
- Row Level Security
- Authentication integration
- Storage
- SQL transactions
- Database migrations
- Relational constraints
- Indexing
- Database-level security controls

Database Principle

PostgreSQL is the source of truth for persistent application data.

Application code must not maintain an independent authoritative copy of core business data.

Security

Protected tables must use PostgreSQL RLS where applicable.

RLS policies must enforce authorized access according to:

- User identity
- Role
- Merchant ownership
- Rider permissions
- Customer ownership
- Administrative permissions

Application-level checks do not replace database-level security.

Database Domains

The database follows the domains defined by the Master Specification:

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

Financial Integrity

Financial values use integer minor units with MAD as the base currency.

Financial records must:

- Be traceable.
- Remain auditable.
- Never be physically deleted.
- Support reversals and adjustments.
- Preserve historical information.

Sensitive financial operations must use database transactions where required.

Migrations

All structural database changes must be represented by version-controlled migrations.

The migration flow is:

"Development → Staging → Production"

Production schema changes must not be performed through undocumented manual SQL edits.

Storage

Sensitive documents such as identity or verification documents must use private storage.

Access must be controlled and authorized.

Sensitive files must not be exposed through unrestricted public URLs.

Environment Isolation

Development, staging and production databases are completely separate.

Production data must never be used as ordinary development or test data.

Alternatives Considered

Self-Managed PostgreSQL

A self-managed PostgreSQL deployment would provide database control but would require additional infrastructure, maintenance, backups, security management and operational work.

NoSQL Database

A NoSQL-first architecture was not selected because WASSLHA has strong relational requirements involving orders, merchants, riders, payments, wallets, settlements and ledger relationships.

Consequences

Positive

- Strong relational integrity.
- Native PostgreSQL transactions.
- RLS support.
- Centralized database security.
- Suitable financial data model.
- Version-controlled migrations.
- Integration with authentication and storage.

Negative

- RLS policies require careful design and testing.
- Complex financial transactions require strict database discipline.
- Schema changes must be managed through migrations.

Review Condition

This decision should be reviewed only if the platform's scale, data requirements or operational architecture materially changes.

Any change must be documented through a new Architecture Decision Record.
