WASSLHA Deployment

Deployment Environments

WASSLHA uses three isolated environments:

1. Development
2. Staging
3. Production

Each environment must have its own:

- Database
- Authentication configuration
- API configuration
- Secrets
- Storage
- Application deployments

Production resources must never be used for development or testing.

Development

Development is used for:

- Daily implementation
- Local testing
- Feature development
- Database migration development
- Unit and integration testing

Development deployments must never affect production data.

Staging

Staging is used for:

- Integration testing
- End-to-end testing
- Security testing
- RLS testing
- Financial testing
- Release candidate validation

Staging should reproduce production configuration as closely as practical without using production data.

Production

Production is the live WASSLHA environment for Berrechid.

Production deployment requires successful completion of the required:

- Functional tests
- RLS tests
- Security tests
- Financial tests
- Recovery tests
- End-to-end tests

Deployment Components

Backend

The WASSLHA API is deployed as a Cloudflare Worker:

"wasslha-api"

The backend must use the correct environment-specific secrets and configuration.

Admin Dashboard

The Admin Dashboard is deployed through Cloudflare Pages.

Merchant Dashboard

The Merchant Dashboard is deployed through Cloudflare Pages.

Mobile Applications

Customer and Rider applications are built using React Native + Expo.

Mobile releases must use the appropriate environment configuration.

Database Deployment

Database changes must be delivered through version-controlled migrations.

The approved flow is:

"Development → Staging → Production"

Production database changes must not be performed manually.

Before applying production migrations:

1. Validate the migration in staging.
2. Run the required tests.
3. Verify backup availability.
4. Confirm rollback or recovery procedures.
5. Apply the approved migration.

Secrets

Secrets must never be committed to Git.

Environment-specific secrets must be stored using secure secret-management mechanisms.

Examples include:

- Supabase service-role key
- Google Maps API key
- Telegram bot token
- Payment provider secret

Development secrets remain local.

Staging and production secrets must use secure platform storage.

Git Deployment Flow

The expected branch flow is:

"feature/* → develop → staging → main"

Where:

- "develop" is used for daily development.
- "staging" is used for release validation.
- "main" represents production.
- "main" and "staging" should be protected.

Production changes must be reviewed before deployment.

Rollback

Every production deployment must have a recovery or rollback procedure.

Rollback planning must consider:

- Backend version
- Dashboard version
- Mobile application compatibility
- Database migrations
- Payment integrations
- API compatibility

Database changes must not rely on destructive rollback operations that could compromise financial or audit history.

Monitoring

Production must provide monitoring for:

- API errors
- Failed requests
- Authentication failures
- Order-processing failures
- Payment failures
- Delivery/dispatch failures
- Notification failures
- Database errors
- Critical security events

Critical failures must generate appropriate operational alerts.

Backups and Recovery

Production data must have regular backups.

Backup procedures must be tested through restore exercises.

A backup that has never been successfully restored must not be considered a verified recovery mechanism.

Minimum App Version

The platform must support minimum-version controls where required.

If a mobile version becomes incompatible with the production API, the system must be able to require an application update.

Production Readiness

WASSLHA must not be launched in production until:

- Security requirements are validated.
- RLS policies are tested.
- Financial reconciliation is validated.
- Backup and restore procedures are tested.
- End-to-end flows are accepted.
- Monitoring is operational.
- Production secrets are correctly configured.
- Deployment and rollback procedures are verified.
