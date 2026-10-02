ADR-006: Merchant Dashboard on Cloudflare Pages

Status

Accepted

Date

2026-09

Context

WASSLHA requires a dedicated web and tablet interface for approved merchants.

The Merchant Dashboard must allow merchants to operate their stores without direct access to protected database operations.

Core merchant operations include:

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

Decision

The WASSLHA Merchant Dashboard will be implemented as a web application and deployed through Cloudflare Pages.

Application:

"apps/merchant"

Deployment:

"wasslha-merchant"

Architecture

The Merchant Dashboard communicates with the WASSLHA backend through:

"/api/v1/"

The backend remains authoritative for:

- Authentication
- Authorization
- Business rules
- Product operations
- Order state transitions
- Financial operations
- Sensitive operations

The dashboard must not bypass backend security controls.

Merchant Authorization

Only approved merchants may operate their stores.

Merchant access must be restricted to resources and operations authorized for that merchant.

A merchant must not be able to access another merchant's:

- Store data
- Products
- Orders
- Earnings
- Settlements
- Customers' protected information

Authorization must be enforced server-side and supported by the database security model.

Core Dashboard Areas

Store

Merchants can manage permitted store information, including:

- Store profile
- Store status
- Opening status
- Closing status
- Pause orders

Products

Merchants can:

- View products
- Add products where permitted
- Update products
- Manage availability
- Deactivate products

Products with historical references should be deactivated rather than physically deleted.

Orders

Merchants can:

- View relevant orders
- Accept orders
- Update preparation status
- Handle permitted order exceptions

Order status changes must follow the backend order state machine.

Earnings

Merchants can view authorized financial information related to their store, including:

- Earnings
- Commissions
- Settlements
- Relevant financial history

Financial records must remain auditable.

Sensitive Changes

Sensitive merchant changes may require additional review or approval according to platform rules.

Examples include:

- Sensitive store information
- Financial configuration
- Verification information

Such changes must not bypass the required approval workflow.

Security

The Merchant Dashboard must:

- Use HTTPS.
- Never expose server-side secrets.
- Never expose the Supabase service-role key.
- Never directly modify protected production database records.
- Respect backend authorization.
- Respect RLS.
- Protect merchant and customer information.

Environment Separation

The dashboard must support:

- Development
- Staging
- Production

Each environment must use its own configuration and credentials.

Production credentials must never be used in development.

Responsive Design

The Merchant Dashboard must support the intended web and tablet usage defined by the product specification.

The interface should remain usable for common merchant workflows on supported screen sizes.

Consequences

Positive

- Dedicated merchant operating interface.
- Suitable for web and tablet usage.
- Clear separation between merchant operations and the customer application.
- Independent deployment through Cloudflare Pages.
- Fits the WASSLHA monorepo architecture.

Negative

- Requires separate UI and workflow testing.
- Merchant permissions require careful implementation.
- Order and financial operations require strong backend validation.

Review Condition

This decision should be reviewed only if merchant operational requirements or the deployment architecture materially change.

Any change must be documented through a new Architecture Decision Record.
