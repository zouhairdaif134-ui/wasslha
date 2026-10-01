WASSLHA Security

Security Principles

Security is enforced at both the application and database levels.

Authentication

- Customer authentication uses phone OTP.
- Rider and Merchant accounts require the appropriate registration and approval flow.
- Admin accounts require strong authentication and 2FA.
- OTP attempts must be rate-limited.

Authorization

WASSLHA uses:

- Role-Based Access Control (RBAC)
- Granular permissions
- PostgreSQL Row Level Security (RLS)

The backend must never rely only on client-side authorization.

Roles

Core roles include:

- Customer
- Rider
- Merchant
- Admin

Each role may only access data and operations explicitly authorized for it.

Sensitive Data

Sensitive identity documents and private information must:

- Use private storage.
- Be protected by strict access policies.
- Never be exposed through public URLs.
- Never be stored in client-side source code.

Secrets

Secrets must never be committed to Git.

Examples include:

- Supabase service-role keys
- Google Maps API keys
- Telegram bot tokens
- Payment provider secrets

Development secrets use local environment configuration.

Staging and production secrets must use secure platform secret storage.

Financial Operations

Sensitive payment and financial operations must support idempotency.

Financial records must not be deleted or silently modified.

Corrections must use explicit reversal or adjustment records.

Audit Logging

Sensitive administrative actions must generate audit records.

Audit logs must be append-only.

Sensitive configuration changes should record the relevant before and after values.

Database Security

RLS must be enabled and tested for protected tables.

No application component may bypass RLS without an explicitly authorized server-side operation.

GPS Privacy

Live rider location is available only during active service where required.

Location access must be restricted by role and business purpose.

Location data must follow the defined retention rules.

Production Security

Production deployment requires successful security, RLS, financial, recovery and end-to-end testing.

Production data must remain isolated from development and staging environments.
