WASSLHA Business Rules

General Principle

Business rules must be configurable whenever the rule may change with the business, service zone, pricing policy or operational requirements.

Rules must not be unnecessarily hard-coded into application interfaces.

Service Area

The initial service area is Berrechid.

Service-zone configuration must support future expansion without requiring a complete rewrite of the platform.

Customer

A customer can:

- Browse available stores and products.
- Search for products and stores.
- Create an order.
- Save delivery addresses.
- Track eligible active deliveries.
- Use supported payment methods.
- Use wallet and loyalty features when eligible.

A customer must provide a valid delivery address before completing the first order.

Merchant

A merchant must be approved by Admin before operating on the platform.

A merchant can:

- Manage store information.
- Configure opening and closing status.
- Pause incoming orders.
- Manage products.
- View orders.
- View earnings and settlements.

Products should be deactivated rather than physically deleted when historical references exist.

Rider

A rider must be approved by Admin before receiving delivery assignments.

Rider operations include:

- Active delivery/service
- Availability
- Slots
- Waiting list
- Performance
- Earnings
- Bonuses and incentives

Slot rules must prevent overlapping assignments and respect configured rest requirements.

Orders

Orders use a controlled state machine.

Normal lifecycle:

"Pending → Accepted → Preparing → Picked Up → On the Way → Delivered"

Exceptional states include:

- Cancelled
- Failed

Invalid state transitions must be rejected by the backend.

Order Timeouts

Merchant and rider response timeouts must be configurable.

When a timeout requires reassignment or escalation, the backend must perform the operation consistently and record the relevant event.

Delivery

Delivery fee calculation must use configured pricing rules.

The system must use road distance when road distance is required.

Get Request — "جيب ليا"

A customer may request an item from a location that is not registered as a merchant.

The request includes:

- What is needed
- Pickup location
- Delivery address
- Budget
- Request type

Possible request types include:

- Pickup
- Buy on behalf of customer

If the purchase exceeds the approved budget, the required approval flow must be triggered.

The rider must provide a purchase receipt where applicable.

Payments

Supported initial payment methods:

- Cash on Delivery
- Online Payment

Sensitive payment operations must be idempotent.

Refunds and Corrections

Refunds must create traceable financial records.

Financial corrections must use reversal or adjustment operations.

Financial history must never be silently overwritten.

Reviews

Reviews must be associated with the relevant completed transaction or service.

Review eligibility and moderation rules must be enforced by the backend.

Notifications

Notifications must respect:

- User role
- Event type
- Authorization
- Notification preferences where applicable

Promotions

Promotions must use configurable eligibility and validity rules.

Expired or invalid promotions must not be applied.

Admin

Admin permissions must be granular.

Sensitive administrative actions must be audited.

Admins must not bypass required financial, security or approval workflows through direct database edits.

Configurability

The following types of rules should be configurable:

- Service zones
- Delivery pricing
- Service fees
- Merchant commissions
- Rider bonuses
- Timeouts
- Slot requirements
- Promotion rules
- Operational thresholds

Configuration changes affecting sensitive operations must be audited.
