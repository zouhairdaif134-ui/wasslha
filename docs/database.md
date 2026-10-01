WASSLHA Database

Database Platform

WASSLHA uses PostgreSQL through Supabase.

Environments

Each environment has its own isolated Supabase project:

- Development
- Staging
- Production

Production data must never be used as development or test data.

Core Principles

- PostgreSQL is the source of truth for persistent application data.
- Row Level Security (RLS) is mandatory for protected data.
- Database migrations are version-controlled in Git.
- Financial records must never be physically deleted.
- Audit records are append-only.
- Sensitive documents must use private storage and controlled access.
- Business rules that may change must be configurable rather than hard-coded.

Main Data Domains

The database is organized around these domains:

1. Identity
2. Commerce
3. Orders
4. Delivery
5. Riders
6. Finance
7. Growth
8. Communication
9. Support and Governance
10. Get Request

Financial Integrity

Financial values use integer minor units with MAD as the base currency.

Financial corrections must use reversals or adjustments rather than destructive edits.

Every order must be traceable through its financial records, including:

- Customer payment
- Delivery fee
- Service fee
- Merchant commission
- Rider earnings
- Merchant settlement
- Refunds
- Wallet movements

Security

Every protected table must have appropriate RLS policies.

Application-level validation does not replace database security.

No production database changes may be performed manually outside the approved migration process.
