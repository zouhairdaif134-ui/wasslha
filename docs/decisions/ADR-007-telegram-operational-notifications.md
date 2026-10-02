ADR-007: Telegram for Operational Notifications

Status

Accepted

Date

2026-09

Context

WASSLHA requires an operational notification channel for important platform events and administrative alerts.

The platform also requires a dedicated Admin Dashboard for actual management and control.

Telegram can provide fast operational notifications without becoming the primary management interface.

Decision

WASSLHA will use Telegram for operational notifications and alerts.

Telegram will not be used as:

- The primary Admin Dashboard
- The authoritative data store
- A replacement for the WASSLHA API
- A replacement for the Admin Dashboard
- A direct database administration interface

Role

Telegram may be used to notify authorized administrators or operational staff about events such as:

- Critical system errors
- Important order exceptions
- Operational alerts
- Payment-related failures
- Delivery or dispatch exceptions
- Security-related alerts
- Other configured administrative notifications

The exact notification events will be defined by the relevant product and operational requirements.

Architecture

The notification flow is:

"WASSLHA Backend → Telegram Bot → Authorized Recipient"

The backend remains the source of truth.

Telegram messages are notifications only.

Bot

Telegram integration will use a dedicated bot managed through BotFather.

The bot token is a secret and must never be committed to Git.

The token must be stored using secure environment-specific secret management.

Security

Telegram notifications must not expose unnecessary sensitive information.

Messages must respect:

- User authorization
- Administrative permissions
- Data minimization
- Sensitive information protection

Sensitive documents, credentials, payment secrets or private authentication information must never be sent through Telegram.

Administrative Actions

If an operational notification requires an administrative action, the administrator must perform that action through the authorized WASSLHA Admin Dashboard or approved backend workflow.

Telegram must not provide an uncontrolled mechanism for changing production data.

Environment Separation

Separate Telegram configuration must be used for:

- Development
- Staging
- Production

Development and staging notifications must not accidentally reach production operational channels.

Reliability

Telegram is not the authoritative delivery mechanism for business operations.

If Telegram is unavailable:

- Orders must continue to use the authoritative WASSLHA backend workflows.
- Financial records must remain intact.
- Operational events must remain recorded.
- Notifications may be retried or handled through another approved mechanism.

A Telegram failure must not corrupt core business data.

Consequences

Positive

- Fast operational alerts.
- Simple notification channel.
- Useful for administrators and operations.
- Keeps notifications separate from the core management interface.

Negative

- External messaging availability is outside WASSLHA's direct control.
- Notification delivery may fail or be delayed.
- Operational staff must not depend on Telegram as the system of record.

Review Condition

This decision should be reviewed if WASSLHA requires a different operational communication architecture or if Telegram no longer satisfies the approved notification requirements.

Any change must be documented through a new Architecture Decision Record.
