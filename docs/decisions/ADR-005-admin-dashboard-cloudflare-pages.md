ADR-005: Admin Dashboard on Cloudflare Pages

Status

Accepted

Date

2026-09

Context

WASSLHA requires a dedicated web-based Admin Dashboard for platform management.

The Admin Dashboard must allow authorized administrators to monitor and manage:

- Users
- Merchants
- Riders
- Orders
- Delivery operations
- Finance
- Wallets
- Settlements
- Support
- Promotions
- Notifications
- System configuration
- Audit information

Telegram notifications are not a replacement for the Admin Dashboard.

Decision

The WASSLHA Admin Dashboard will be implemented as a web application and deployed through Cloudflare Pages.

Application:

"apps/admin"

Deployment:

"wasslha-admin"

Architecture

The Admin Dashboard communicates with the WASSLHA backend through:

"/api/v1/"

The backend remains authoritative for:

- Authorization
- Business rules
- Validation
- Financial operations
- Sensitive administrative operations

The dashboard must not bypass backend security controls.

Authentication

Admin access must support:

- Strong authentication
- Two-factor authentication
- Role-based access
- Granular permissions
- Session security

Administrative actions must be checked server-side.

Authorization

Dashboard access must depend on the authenticated administrator's permissions.

Permissions may control access to:

- Users
- Merchants
- Riders
- Orders
- Finance
- Configuration
- Audit records

A UI restriction alone is not sufficient authorization.

Operational Areas

The dashboard will progressively support:

Operations

- Orders
- Delivery
- Riders
- Merchants

Finance

- Payments
- Wallets
- Ledger
- Merchant settlements
- Rider earnings
- Refunds
- Adjustments

Governance

- Users
- Roles
- Permissions
- Audit logs
- Sensitive configuration

Support

- Complaints
- Refund requests
- Reviews
- Notifications

Configuration

Configurable business rules must be managed through authorized backend operations.

Examples:

- Service zones
- Delivery pricing
- Service fees
- Merchant commissions
- Rider bonuses
- Timeouts
- Slot requirements
- Promotion rules

Sensitive configuration changes must be audited.

Security

The Admin Dashboard must:

- Use HTTPS.
- Never contain server-side secrets.
- Never expose Supabase service-role credentials.
- Never directly modify protected production database records.
- Respect backend authorization.
- Respect RLS architecture.
- Protect sensitive information.

Environment Separation

The dashboard must support:

- Development
- Staging
- Production

Each deployment must use the correct environment configuration.

Production configuration must never be used in development.

Telegram Relationship

Telegram is an operational notification channel only.

It may notify authorized administrators about important events, but administrative control remains inside the secured Admin Dashboard and approved backend operations.

Consequences

Positive

- Dedicated control center for WASSLHA.
- Clear separation between management and notifications.
- Independent web deployment.
- Suitable for desktop, tablet and responsive administration workflows.
- Fits the Cloudflare architecture.

Negative

- Requires separate dashboard implementation and testing.
- Permission design must be carefully controlled.
- Financial and operational actions require additional auditability.

Review Condition

This decision should be reviewed only if the administrative requirements or deployment architecture materially change.

Any change must be documented through a new Architecture Decision Record.
