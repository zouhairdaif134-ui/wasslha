WASSLHA Financial Model

Currency

The base currency is Moroccan Dirham (MAD).

Financial amounts must be stored as integer minor units to avoid floating-point calculation errors.

Order Financial Components

An order may contain:

- Product subtotal
- Delivery fee
- Service fee
- Discount
- Wallet contribution
- Loyalty points contribution
- Customer tip
- Final customer total

Delivery Fee

The delivery fee is calculated using configurable business rules.

The initial model is based on:

"Base Fee + Road Distance × Price per Kilometer"

The values must be configurable and must not be permanently hard-coded.

Merchant Commission

Merchant commission is calculated according to the configured commission rules.

The commission must be traceable to the corresponding order and merchant settlement.

Rider Earnings

Rider earnings must be calculated and recorded independently from the customer delivery fee.

Applicable bonuses and incentives must be represented explicitly.

Payments

The platform supports:

- Cash on Delivery (COD)
- Online payment

Payment operations must be idempotent where required.

Wallet

Wallet movements must be recorded as ledger entries.

A wallet balance must be derived from valid financial movements or maintained through a transaction-safe mechanism.

Wallet corrections must use explicit adjustment records.

Ledger

Every financial movement must be traceable.

The ledger must allow the system to identify:

- Source transaction
- Related order
- Account or wallet
- Amount
- Direction
- Currency
- Timestamp
- Reference
- Adjustment or reversal relationship where applicable

Financial Integrity

Financial records must never be physically deleted.

Historical financial records must not be silently overwritten.

Corrections must use:

- Reversal
- Adjustment
- Refund

as appropriate.

All sensitive financial operations must use database transactions.

Reconciliation

The system must support reconciliation between:

- Customer payments
- Orders
- Merchant commissions
- Rider earnings
- Merchant settlements
- Wallet movements
- Refunds
- Ledger entries

Every order must allow the platform to trace every dirham associated with it.

Settlement

Merchant settlements must be recorded explicitly.

Settlement records must remain auditable and must not replace the underlying order or ledger history.

Administrative Corrections

Admin users may correct financial exceptions only through authorized operations.

Direct manual database edits are not an accepted production correction mechanism.
