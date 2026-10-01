WASSLHA Environments

Overview

WASSLHA uses three isolated environments:

1. Development
2. Staging
3. Production

Each environment must use separate infrastructure, configuration and credentials.

Development

Development is used for daily implementation and testing.

Resources

- Supabase: "wasslha-development"
- Cloudflare Worker: Development configuration
- Admin Dashboard: Development deployment
- Merchant Dashboard: Development deployment
- Mobile Apps: Development configuration

Rules

- Development data is disposable.
- Test accounts may be created.
- Production credentials must never be used.
- Development must never connect to production databases.

Staging

Staging is the release-validation environment.

Resources

- Supabase: "wasslha-staging"
- Cloudflare Worker: Staging configuration
- Admin Dashboard: Staging deployment
- Merchant Dashboard: Staging deployment
- Mobile Apps: Staging configuration

Rules

- Staging must remain isolated from production.
- Staging should reproduce production behavior as closely as practical.
- Production personal or financial data must not be copied into staging.
- Release candidates must be tested here before production.

Production

Production is the live Berrechid environment.

Resources

- Supabase: "wasslha-production"
- Cloudflare Worker: Production configuration
- Admin Dashboard: Production deployment
- Merchant Dashboard: Production deployment
- Customer Mobile App: Production configuration
- Rider Mobile App: Production configuration

Rules

- Production credentials are restricted.
- Production data must never be used for development.
- Direct database modification is prohibited.
- Database changes must use approved migrations.
- Sensitive administrative actions must be audited.

Environment Variables

Environment-specific configuration must be supplied separately for each environment.

Examples:

- "SUPABASE_URL"
- "SUPABASE_ANON_KEY"
- "SUPABASE_SERVICE_ROLE_KEY"
- "GOOGLE_MAPS_API_KEY"
- "TELEGRAM_BOT_TOKEN"
- "PAYMENT_SECRET_KEY"

Secrets must never be committed to Git.

Environment Flow

The standard promotion flow is:

"Development → Staging → Production"

Code must be validated in the previous environment before promotion.

Data Isolation

The three environments must have separate:

- Databases
- Authentication users
- Storage
- Secrets
- API configuration
- Application deployments

No environment may accidentally use another environment's credentials.

Production Protection

Production access must be limited to authorized operations.

Production deployment requires:

- Reviewed code
- Successful automated tests
- RLS validation
- Security validation
- Financial validation
- End-to-end acceptance
- Verified backup and recovery procedures

Configuration Changes

Changes to sensitive production configuration must:

- Require appropriate authorization.
- Be recorded in the audit log.
- Preserve before and after values where applicable.
- Avoid direct database edits.

Environment Principle

Environment isolation is mandatory.

A configuration mistake must not allow development or staging activity to modify production data.
