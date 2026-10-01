WASSLHA GPS and Location

Purpose

GPS is a core infrastructure component of WASSLHA.

The system uses location data for:

- Customer addresses
- Store locations
- Rider locations
- Delivery distance
- Route calculation
- ETA
- Dispatch
- Live delivery tracking

Customer Location

Customers can:

- Grant location permission.
- Select a location on the map.
- Save delivery addresses.
- Add address details.
- Use their saved addresses during checkout.

The system must validate whether the delivery address is inside the supported service zone.

Store Location

Each store must have a registered location.

Store location data is used for:

- Delivery distance calculation
- Route planning
- Rider dispatch
- ETA calculation

Rider Live Location

Rider live location is used during an active delivery/service.

The rider application may send location updates while the rider is actively working on an assigned service.

Live location access must be restricted according to role and business purpose.

Dispatch Route

For a normal delivery, the route may include:

"Rider → Merchant(s) → Customer"

For multi-store orders, the dispatch system must support the required merchant pickup sequence.

Distance and ETA

The backend must use a map/route service layer for:

- Road distance
- Estimated travel time
- Route calculation

Business rules must not depend on straight-line distance when road distance is required.

Service Zone

The initial operating area is Berrechid.

Out-of-zone rules must be configurable rather than permanently hard-coded.

Live Tracking

After pickup, the customer may see the rider's live location for the active delivery.

Live tracking must:

- Be access-controlled.
- Be available only when applicable.
- Follow defined retention rules.
- Avoid unnecessary long-term storage of precise location data.

Privacy

Location data is sensitive operational data.

Access must be limited to authorized users and services.

The system must not expose rider location publicly.
