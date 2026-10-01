ADR-004: Mobile Applications with React Native and Expo

Status

Accepted

Date

2026-09

Context

WASSLHA requires two mobile applications:

- Customer Mobile App
- Rider Mobile App

Both applications require access to platform capabilities including:

- GPS
- Location permissions
- Maps
- Notifications
- Authentication
- API communication
- Order tracking
- Live delivery location
- Mobile device capabilities

The initial MVP should avoid unnecessary duplication between the two mobile applications.

Decision

WASSLHA will use React Native + Expo for the Customer and Rider mobile applications.

The applications will remain separate products while sharing appropriate code and configuration through the monorepo.

Applications

Customer

Location:

"apps/customer"

Purpose:

- Customer onboarding
- Store discovery
- Search
- Product browsing
- Cart
- Checkout
- Orders
- GPS addresses
- Delivery tracking
- Profile

Rider

Location:

"apps/rider"

Purpose:

- Rider onboarding
- Availability
- Slots
- Delivery assignments
- GPS location
- Navigation-related workflows
- Pickup confirmation
- Delivery confirmation
- Earnings
- Performance

Shared Code

Common functionality may be placed in shared packages when appropriate.

Examples include:

- Type definitions
- API contracts
- Validation utilities
- Configuration
- Common business constants

Application-specific UI and workflows remain inside their respective applications.

GPS

The mobile applications must support the GPS requirements defined by the Master Specification.

Customer capabilities include:

- Location permission
- Map-based address selection
- Saved addresses
- Delivery location

Rider capabilities include:

- Active-service location updates
- Delivery tracking
- Location-based operational workflows

Location access must follow the security and privacy rules defined by WASSLHA.

API Communication

Mobile applications must communicate with the WASSLHA backend through the versioned API.

Initial API base path:

"/api/v1/"

Mobile applications must not treat client-side validation as a security boundary.

Authentication

Customer authentication uses the approved phone OTP flow.

Rider authentication and approval follow the platform's rider registration and authorization requirements.

Authentication credentials and secrets must not be embedded in the application source code.

Environment Configuration

Mobile applications must support separate configurations for:

- Development
- Staging
- Production

Production credentials must never be used in development builds.

Consequences

Positive

- One mobile technology for both applications.
- Shared TypeScript ecosystem.
- Reduced duplicated implementation effort.
- Suitable access to mobile device capabilities.
- Good fit with the monorepo architecture.

Negative

- Native platform differences still require testing.
- GPS and background location behavior require careful implementation.
- Mobile releases require version compatibility with the backend.
- Device-specific issues must be tested on real devices.

Testing

Both applications must be tested for:

- Authentication
- API communication
- GPS permissions
- Location behavior
- Network failures
- Order workflows
- Notifications
- App version compatibility
- Security
- End-to-end delivery flows

Review Condition

This decision should be reviewed if mobile requirements, platform constraints or operational scale materially change.

Any change must be documented through a new Architecture Decision Record.
