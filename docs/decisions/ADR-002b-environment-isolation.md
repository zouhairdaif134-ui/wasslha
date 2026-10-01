ADR-002b: Environment Isolation

Status

Accepted

Date

2026-09

Context

WASSLHA requires separate Development, Staging and Production environments.

The platform handles:

- Customer data
- Merchant data
- Rider data
- Orders
- Payments
- Wallets
- Financial records
- Sensitive documents
- Operational configuration

Mixing environments could expose production data or allow testing activity to affect the live platform.

Decision

WASSLHA will maintain three fully isolated environments:

1. Development
2. Staging
3. Production

Each environment must have its own infrastructure configuration and credentials.

Environment Mapping

Environment| Supabase| Cloudflare| Purpose
Development| "wasslha-development"| Development configuration| Daily development
Staging| "wasslha-staging"| Staging configuration| Testing and release validation
Production| "wasslha-production"| Production configuration| Live platform

Data Isolation

Each environment must use its own:

- PostgreSQL database
- Authentication users
- Storage
- API configuration
- Secrets
- Environment variables

Production data must never be used directly for development or ordinary testing.

Secret Isolation

Credentials must be unique to each environment.

Development credentials must never provide access to production resources.

Production secrets must only be available to authorized production deployments and operations.

Deployment Flow

The standard promotion flow is:

"Development → Staging → Production"

Code must pass the required validation in each environment before promotion.

Production Protection

Production must be protected against:

- Direct development access
- Accidental test operations
- Unapproved database changes
- Incorrect environment variables
- Reuse of development credentials

Database Changes

Database schema changes must be tested in Development and Staging before production deployment.

Production database changes must use approved version-controlled migrations.

Consequences

Positive

- Prevents accidental production data modification.
- Reduces environment-related security risks.
- Makes testing safer.
- Provides a clear deployment path.
- Supports controlled production releases.

Negative

- Requires maintaining multiple environments.
- Requires separate credentials and configuration.
- Some changes must be validated more than once.

Review Condition

This decision remains valid unless the deployment architecture or security requirements materially change.

Any change must be documented through a new Architecture Decision Record.
