# WASSLHA Connected Integration Contracts

## Purpose

This document defines the contracts between WASSLHA application surfaces and the backend. It complements ADR-009 and prevents client-specific business logic from becoming a second source of truth.

## Contract hierarchy

1. Authentication and environment boundary
2. API request/response contract
3. Authorization and RLS
4. Domain state machine
5. Financial integrity
6. Integration side effects

A lower layer cannot weaken a higher layer.

## Application-to-API contracts

| Client | Primary API domains | Authority |
|---|---|---|
| Customer | auth, marketplace, orders, payments, tracking, wallet, growth, support | API + PostgreSQL |
| Merchant | merchant, stores, products, orders, settlements | API + PostgreSQL |
| Rider | rider, slots, dispatch, delivery, tracking, earnings | API + PostgreSQL |
| Admin | operations, users, finance, support, reports, governance, audit | API + PostgreSQL |

## Authentication

Every protected request carries an environment-specific Supabase access token.

The API creates a request context from that token and derives the authenticated user identity. Clients must never submit an arbitrary user identity as an authorization mechanism.

Admin MFA is enforced by the Admin authentication flow.

## Authorization

Authorization is layered:

- API RBAC/granular permission checks
- PostgreSQL RLS
- server-side ownership checks where required

Client-side route hiding is UX only and is never a security boundary.

## Order contract

Orders are authoritative in PostgreSQL.

Order mutations must:

- validate the current state
- use the order state machine
- record the transition history
- reject invalid transitions
- support idempotency for sensitive client retries

A client must not directly assign an arbitrary order status.

## Delivery contract

Delivery and assignment state are authoritative in PostgreSQL.

Dispatch must prevent duplicate active assignments. Rider acceptance/rejection must be tied to the authenticated rider identity.

Live rider location is available only within the permitted active-service lifecycle.

## Financial contract

Money uses integer minor units in MAD.

Payment, commission, rider earnings, merchant settlement, wallet and refund operations must remain traceable through the financial ledger.

Financial corrections use reversal/adjustment semantics rather than destructive deletion.

Clients never calculate authoritative settlement amounts.

## Notification contract

Notifications are side effects of authoritative domain events.

Notification providers such as push, SMS or Telegram may fail or retry. Provider state must not replace order, delivery or financial state.

Retries must be safe and must not create duplicate business transactions.

## Maps contract

Maps operations are accessed through the backend Maps service layer for protected routing and dispatch decisions.

The Maps provider supplies route/geocoding information; it does not own WASSLHA order or delivery state.

## Admin governance contract

Governance reads and mutations are permission-controlled.

Sensitive setting changes must include:

- authenticated admin identity
- explicit reason
- before value
- after value
- audit record

No sensitive setting is changed directly from the browser against a service-role connection.

## Environment contract

Development, Staging and Production are isolated.

Each client build must point only to its intended environment. Production credentials and data must never be embedded in development or staging builds.

## Failure contract

A failed external provider call must not silently create an inconsistent authoritative state.

For retryable operations:

- use idempotency keys
- preserve request IDs for observability
- return deterministic business errors where possible
- retry asynchronous side effects through controlled jobs

## End-to-end acceptance contract

The connected system is not production-ready until this flow succeeds in an isolated test environment:

Customer → Merchant → Rider → Pickup → Delivery → Payment → Commission → Rider Earnings → Merchant Settlement

The test must also cover rejection, cancellation, payment failure, refund, no-rider, merchant delay, duplicate request and concurrency cases.
