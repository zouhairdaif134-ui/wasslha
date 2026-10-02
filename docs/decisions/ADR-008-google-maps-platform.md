ADR-008: Google Maps Platform for GPS and Routing

Status

Accepted

Date

2026-09

Context

GPS is a core infrastructure component of WASSLHA.

The platform requires location capabilities for:

- Customer delivery addresses
- Store locations
- Rider locations
- Road distance
- Route calculation
- ETA
- Dispatch
- Live delivery tracking

The system must use road-based distance and routing where required rather than relying only on straight-line distance.

Decision

WASSLHA will use Google Maps Platform as the external map and routing service.

The integration will be accessed through a dedicated service layer so that business logic does not depend directly on a single provider implementation.

Main Uses

Google Maps services may support:

- Maps
- Address and location handling
- Geocoding
- Road distance
- Route calculation
- Estimated travel time
- Navigation-related workflows

The exact Google Maps APIs used in implementation must be confirmed against the current platform capabilities and approved technical configuration.

Architecture

The intended flow is:

"Mobile/Web App → WASSLHA API → Maps Service Layer → Google Maps Platform"

The backend remains responsible for applying WASSLHA business rules.

The client must not independently determine authoritative delivery pricing or other sensitive business calculations.

Delivery Distance

When road distance is required, WASSLHA must use road-based routing information.

The delivery pricing model defined by the specification is:

"Base Fee + Road Distance × Price per Kilometer"

The pricing values remain configurable.

ETA

Route and travel-time information may be used to calculate delivery ETA.

ETA is an operational estimate and must not be treated as a guaranteed delivery time.

GPS Privacy

Location data is sensitive.

WASSLHA must:

- Restrict location access by role.
- Limit rider live-location access to applicable active services.
- Avoid unnecessary long-term retention of precise location data.
- Prevent public exposure of rider location.
- Apply the defined retention rules.

Rider Tracking

During an active delivery, the rider application may provide location updates.

After pickup, the customer may receive authorized live tracking information for the active delivery.

Access must be controlled by the backend and platform authorization rules.

Service Zone

The initial operating area is Berrechid.

Service-zone validation remains a WASSLHA business rule and must not be permanently hard-coded into the map provider integration.

The architecture must support future service-zone expansion.

API Key Security

Google Maps credentials are secrets or restricted credentials depending on the specific API usage.

They must:

- Never be committed to Git.
- Use appropriate API restrictions.
- Be separated by environment where required.
- Be stored using secure configuration mechanisms.

Failure Handling

A temporary Maps service failure must not corrupt core WASSLHA data.

The platform must handle failures appropriately for:

- Distance calculation
- Route calculation
- ETA
- Map display
- Location-related requests

Critical financial and order records must remain authoritative in WASSLHA systems.

Service Abstraction

WASSLHA should use an internal Maps Service Layer rather than scattering provider-specific API calls throughout the codebase.

This allows:

- Centralized configuration
- Consistent error handling
- Easier testing
- Controlled provider changes
- Future integration with another map provider if required

Consequences

Positive

- Established mapping and routing capabilities.
- Road distance suitable for delivery pricing.
- Routing and ETA support.
- Suitable foundation for GPS-based dispatch and tracking.

Negative

- External service dependency.
- API usage may generate costs.
- API quotas and availability must be monitored.
- Location data requires careful privacy controls.

Review Condition

This decision should be reviewed if:

- Mapping requirements materially change.
- Cost or quota constraints become significant.
- A different provider becomes technically necessary.
- Privacy or regulatory requirements change.

Any change must be documented through a new Architecture Decision Record.
