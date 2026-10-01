ADR-001: Monorepo Architecture

Status

Accepted

Date

2026-09

Context

WASSLHA is a multi-application platform consisting of:

- Customer Mobile App
- Rider Mobile App
- Merchant Dashboard
- Admin Dashboard
- Backend API
- Shared database and security definitions
- Shared types and configuration

The platform also requires consistent coordination between application code, database migrations, shared types and technical documentation.

Decision

WASSLHA will use a monorepo architecture.

The repository will contain the platform applications and shared packages in one Git repository.

The initial structure includes:

apps/
  api/
  admin/
  merchant/
  customer/
  rider/

packages/
  shared/
  database/
  ui/
  config/

supabase/
docs/

Reasons

The monorepo provides:

- One source of truth for the platform code.
- Shared TypeScript types.
- Shared configuration.
- Centralized database migrations.
- Easier coordination between frontend and backend changes.
- Consistent versioning.
- Easier cross-application testing.
- Clear ownership of the complete platform.

Repository

The official source repository is:

"wasslha"

GitHub is the source of truth for the codebase.

Branch Strategy

The repository uses:

- "main" — production
- "staging" — release validation
- "develop" — daily development
- "feature/*" — feature development
- "fix/*" — bug fixes

Production and staging branches should be protected.

Alternatives Considered

Multiple Repositories

Each application could have its own repository.

This was not selected for the initial MVP because it would increase coordination overhead and make shared types, migrations and cross-application changes more difficult to manage.

Separate Repositories Later

A future migration to multiple repositories remains technically possible if the organization or platform scale requires it.

Such a change requires a documented architecture decision before implementation.

Consequences

Positive

- Shared code is easier to maintain.
- Database migrations remain close to application code.
- Cross-platform changes are easier to coordinate.
- CI/CD can be centralized.
- Development remains organized around one platform repository.

Negative

- Repository structure requires clear ownership.
- Build and deployment pipelines must correctly target individual applications.
- Dependencies must be managed carefully.
- A mistake in shared packages can affect multiple applications.

Constraints

The monorepo must not become a reason to bypass application boundaries.

Each application remains independently deployable where required.

Production credentials and environment configuration must remain isolated.

Review Condition

This decision should be reconsidered only if the platform's scale, team structure, deployment requirements or security boundaries make the monorepo architecture unsuitable.

Any change must be documented through a new Architecture Decision Record.
