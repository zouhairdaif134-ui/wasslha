-- WASSLHA
-- Migration #67
-- Finance Foundation
-- Berrechid MVP
--
-- Financial rules:
-- - MAD only
-- - integer minor units (centimes)
-- - no destructive deletion of financial records
-- - corrections through refunds/reversals/adjustments
-- - every financial operation must remain traceable

begin;

-- =========================================================
-- 1. PAYMENTS
-- =========================================================

create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),

    master_order_id uuid not null
        references public.master_orders(id) on delete restrict,

    customer_id uuid not null
        references public.users(id) on delete restrict,

    payment_method text not null
        check (
            payment_method in (
                'cod',
                'online'
            )
        ),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'authorized',
                'paid',
                'failed',
                'cancelled',
                'partially_refunded',
                'refunded'
            )
        ),

    amount_minor integer not null,

    currency text not null default 'MAD',

    provider text,
    provider_payment_id text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint payments_amount_positive
        check (amount_minor > 0),

    constraint payments_currency_mad
        check (currency = 'MAD')
);

create index if not exists payments_master_order_idx
    on public.payments (master_order_id);

create index if not exists payments_customer_idx
    on public.payments (customer_id);

create index if not exists payments_status_idx
    on public.payments (status);

create unique index if not exists payments_provider_reference_idx
    on public.payments (provider, provider_payment_id)
    where provider is not null
      and provider_payment_id is not null;


-- =========================================================
-- 2. PAYMENT TRANSACTIONS
-- =========================================================

create table if not exists public.payment_transactions (
    id uuid primary key default gen_random_uuid(),

    payment_id uuid not null
        references public.payments(id) on delete restrict,

    transaction_type text not null
        check (
            transaction_type in (
                'authorization',
                'capture',
                'charge',
                'refund',
                'void',
                'failure',
                'adjustment'
            )
        ),

    status text not null
        check (
            status in (
                'pending',
                'succeeded',
                'failed'
            )
        ),

    amount_minor integer not null,

    currency text not null default 'MAD',

    provider_transaction_id text,

    idempotency_key text not null unique,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint payment_transactions_amount_positive
        check (amount_minor > 0),

    constraint payment_transactions_currency_mad
        check (currency = 'MAD')
);

create index if not exists payment_transactions_payment_idx
    on public.payment_transactions (payment_id);

create index if not exists payment_transactions_created_idx
    on public.payment_transactions (created_at desc);


-- =========================================================
-- 3. WALLETS
-- =========================================================

create table if not exists public.wallets (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete restrict,

    balance_minor bigint not null default 0,

    currency text not null default 'MAD',

    status text not null default 'active'
        check (
            status in (
                'active',
                'frozen',
                'closed'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint wallets_balance_nonnegative
        check (balance_minor >= 0),

    constraint wallets_currency_mad
        check (currency = 'MAD')
);

create unique index if not exists wallets_user_unique_idx
    on public.wallets (user_id);

create index if not exists wallets_status_idx
    on public.wallets (status);


-- =========================================================
-- 4. WALLET TRANSACTIONS
-- =========================================================

create table if not exists public.wallet_transactions (
    id uuid primary key default gen_random_uuid(),

    wallet_id uuid not null
        references public.wallets(id) on delete restrict,

    transaction_type text not null
        check (
            transaction_type in (
                'credit',
                'debit',
                'refund',
                'adjustment',
                'withdrawal'
            )
        ),

    amount_minor bigint not null,

    balance_before_minor bigint not null,
    balance_after_minor bigint not null,

    reference_type text,
    reference_id uuid,

    idempotency_key text not null unique,

    description text,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint wallet_transactions_amount_positive
        check (amount_minor > 0),

    constraint wallet_transactions_balance_before_nonnegative
        check (balance_before_minor >= 0),

    constraint wallet_transactions_balance_after_nonnegative
        check (balance_after_minor >= 0)
);

create index if not exists wallet_transactions_wallet_idx
    on public.wallet_transactions (wallet_id, created_at desc);

create index if not exists wallet_transactions_reference_idx
    on public.wallet_transactions (reference_type, reference_id);


-- =========================================================
-- 5. FINANCIAL LEDGER
-- =========================================================

create table if not exists public.financial_ledger (
    id uuid primary key default gen_random_uuid(),

    master_order_id uuid
        references public.master_orders(id) on delete restrict,

    sub_order_id uuid
        references public.sub_orders(id) on delete restrict,

    payment_id uuid
        references public.payments(id) on delete restrict,

    entry_type text not null
        check (
            entry_type in (
                'sale',
                'delivery_fee',
                'discount',
                'commission',
                'rider_earning',
                'merchant_payable',
                'payment',
                'refund',
                'adjustment'
            )
        ),

    direction text not null
        check (
            direction in (
                'debit',
                'credit'
            )
        ),

    amount_minor bigint not null,

    currency text not null default 'MAD',

    reference_type text,
    reference_id uuid,

    idempotency_key text not null unique,

    description text,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint financial_ledger_amount_positive
        check (amount_minor > 0),

    constraint financial_ledger_currency_mad
        check (currency = 'MAD')
);

create index if not exists financial_ledger_master_order_idx
    on public.financial_ledger (master_order_id, created_at);

create index if not exists financial_ledger_sub_order_idx
    on public.financial_ledger (sub_order_id, created_at);

create index if not exists financial_ledger_reference_idx
    on public.financial_ledger (reference_type, reference_id);


-- =========================================================
-- 6. MERCHANT SETTLEMENTS
-- =========================================================

create table if not exists public.merchant_settlements (
    id uuid primary key default gen_random_uuid(),

    merchant_id uuid not null
        references public.merchants(id) on delete restrict,

    period_start date not null,
    period_end date not null,

    gross_amount_minor bigint not null default 0,
    commission_minor bigint not null default 0,
    refund_minor bigint not null default 0,
    adjustment_minor bigint not null default 0,
    net_amount_minor bigint not null default 0,

    currency text not null default 'MAD',

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'approved',
                'paid',
                'cancelled'
            )
        ),

    paid_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint merchant_settlements_period_order
        check (period_end >= period_start),

    constraint merchant_settlements_gross_nonnegative
        check (gross_amount_minor >= 0),

    constraint merchant_settlements_commission_nonnegative
        check (commission_minor >= 0),

    constraint merchant_settlements_refund_nonnegative
        check (refund_minor >= 0),

    constraint merchant_settlements_adjustment_nonnegative
        check (adjustment_minor >= 0),

    constraint merchant_settlements_net_nonnegative
        check (net_amount_minor >= 0),

    constraint merchant_settlements_currency_mad
        check (currency = 'MAD')
);

create index if not exists merchant_settlements_merchant_idx
    on public.merchant_settlements (merchant_id, period_start desc);


-- =========================================================
-- 7. RIDER EARNINGS
-- =========================================================

create table if not exists public.rider_earnings (
    id uuid primary key default gen_random_uuid(),

    rider_id uuid not null
        references public.riders(id) on delete restrict,

    delivery_id uuid
        references public.deliveries(id) on delete restrict,

    amount_minor bigint not null,

    bonus_minor bigint not null default 0,

    adjustment_minor bigint not null default 0,

    total_minor bigint not null,

    currency text not null default 'MAD',

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'approved',
                'paid',
                'cancelled'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint rider_earnings_amount_nonnegative
        check (amount_minor >= 0),

    constraint rider_earnings_bonus_nonnegative
        check (bonus_minor >= 0),

    constraint rider_earnings_adjustment_nonnegative
        check (adjustment_minor >= 0),

    constraint rider_earnings_total_nonnegative
        check (total_minor >= 0),

    constraint rider_earnings_currency_mad
        check (currency = 'MAD')
);

create index if not exists rider_earnings_rider_idx
    on public.rider_earnings (rider_id, created_at desc);

create index if not exists rider_earnings_delivery_idx
    on public.rider_earnings (delivery_id);


-- =========================================================
-- 8. RIDER WITHDRAWALS
-- =========================================================

create table if not exists public.rider_withdrawals (
    id uuid primary key default gen_random_uuid(),

    rider_id uuid not null
        references public.riders(id) on delete restrict,

    amount_minor bigint not null,

    currency text not null default 'MAD',

    status text not null default 'requested'
        check (
            status in (
                'requested',
                'approved',
                'processing',
                'paid',
                'rejected',
                'cancelled'
            )
        ),

    idempotency_key text not null unique,

    requested_at timestamptz not null default now(),
    processed_at timestamptz,

    processed_by uuid
        references public.users(id) on delete set null,

    rejection_reason text,

    created_at timestamptz not null default now(),

    constraint rider_withdrawals_amount_positive
        check (amount_minor > 0),

    constraint rider_withdrawals_currency_mad
        check (currency = 'MAD')
);

create index if not exists rider_withdrawals_rider_idx
    on public.rider_withdrawals (rider_id, created_at desc);

create index if not exists rider_withdrawals_status_idx
    on public.rider_withdrawals (status);


-- =========================================================
-- 9. REFUNDS
-- =========================================================

create table if not exists public.refunds (
    id uuid primary key default gen_random_uuid(),

    master_order_id uuid not null
        references public.master_orders(id) on delete restrict,

    payment_id uuid
        references public.payments(id) on delete restrict,

    amount_minor bigint not null,

    currency text not null default 'MAD',

    reason_code text not null,
    reason_text text,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'approved',
                'processing',
                'completed',
                'failed',
                'cancelled'
            )
        ),

    idempotency_key text not null unique,

    requested_by uuid
        references public.users(id) on delete set null,

    approved_by uuid
        references public.users(id) on delete set null,

    completed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint refunds_amount_positive
        check (amount_minor > 0),

    constraint refunds_currency_mad
        check (currency = 'MAD')
);

create index if not exists refunds_master_order_idx
    on public.refunds (master_order_id, created_at);

create index if not exists refunds_status_idx
    on public.refunds (status);


-- =========================================================
-- 10. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists payments_set_updated_at
    on public.payments;

create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();


drop trigger if exists wallets_set_updated_at
    on public.wallets;

create trigger wallets_set_updated_at
before update on public.wallets
for each row
execute function public.set_updated_at();


drop trigger if exists merchant_settlements_set_updated_at
    on public.merchant_settlements;

create trigger merchant_settlements_set_updated_at
before update on public.merchant_settlements
for each row
execute function public.set_updated_at();


drop trigger if exists rider_earnings_set_updated_at
    on public.rider_earnings;

create trigger rider_earnings_set_updated_at
before update on public.rider_earnings
for each row
execute function public.set_updated_at();


drop trigger if exists refunds_set_updated_at
    on public.refunds;

create trigger refunds_set_updated_at
before update on public.refunds
for each row
execute function public.set_updated_at();


-- =========================================================
-- 11. ENABLE RLS
-- =========================================================

alter table public.payments enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.financial_ledger enable row level security;
alter table public.merchant_settlements enable row level security;
alter table public.rider_earnings enable row level security;
alter table public.rider_withdrawals enable row level security;
alter table public.refunds enable row level security;


-- =========================================================
-- 12. PAYMENTS RLS
-- =========================================================

drop policy if exists payments_select_customer_admin
    on public.payments;

create policy payments_select_customer_admin
on public.payments
for select
to authenticated
using (
    public.has_role('admin')
    or customer_id = auth.uid()
);


-- =========================================================
-- 13. PAYMENT TRANSACTIONS RLS
-- =========================================================

drop policy if exists payment_transactions_select_customer_admin
    on public.payment_transactions;

create policy payment_transactions_select_customer_admin
on public.payment_transactions
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.payments p
        where p.id = payment_transactions.payment_id
          and p.customer_id = auth.uid()
    )
);


-- =========================================================
-- 14. WALLETS RLS
-- =========================================================

drop policy if exists wallets_select_own_admin
    on public.wallets;

create policy wallets_select_own_admin
on public.wallets
for select
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
);


-- Wallet balances and transactions are backend controlled.


-- =========================================================
-- 15. WALLET TRANSACTIONS RLS
-- =========================================================

drop policy if exists wallet_transactions_select_own_admin
    on public.wallet_transactions;

create policy wallet_transactions_select_own_admin
on public.wallet_transactions
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.wallets w
        where w.id = wallet_transactions.wallet_id
          and w.user_id = auth.uid()
    )
);


-- =========================================================
-- 16. FINANCIAL LEDGER RLS
-- =========================================================

drop policy if exists financial_ledger_select_admin
    on public.financial_ledger;

create policy financial_ledger_select_admin
on public.financial_ledger
for select
to authenticated
using (
    public.has_role('admin')
);


-- Ledger writes are backend controlled and append-only.


-- =========================================================
-- 17. MERCHANT SETTLEMENTS RLS
-- =========================================================

drop policy if exists merchant_settlements_select_owner_admin
    on public.merchant_settlements;

create policy merchant_settlements_select_owner_admin
on public.merchant_settlements
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.merchants m
        where m.id = merchant_settlements.merchant_id
          and m.user_id = auth.uid()
    )
);


-- =========================================================
-- 18. RIDER EARNINGS RLS
-- =========================================================

drop policy if exists rider_earnings_select_own_admin
    on public.rider_earnings;

create policy rider_earnings_select_own_admin
on public.rider_earnings
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
);


-- =========================================================
-- 19. RIDER WITHDRAWALS RLS
-- =========================================================

drop policy if exists rider_withdrawals_select_own_admin
    on public.rider_withdrawals;

create policy rider_withdrawals_select_own_admin
on public.rider_withdrawals
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
);


drop policy if exists rider_withdrawals_insert_own
    on public.rider_withdrawals;

create policy rider_withdrawals_insert_own
on public.rider_withdrawals
for insert
to authenticated
with check (
    rider_id = auth.uid()
    and public.has_role('rider')
);


-- Processing remains backend/admin controlled.


-- =========================================================
-- 20. REFUNDS RLS
-- =========================================================

drop policy if exists refunds_select_customer_admin
    on public.refunds;

create policy refunds_select_customer_admin
on public.refunds
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.master_orders mo
        where mo.id = refunds.master_order_id
          and mo.customer_id = auth.uid()
    )
);


-- Refund creation/approval/completion is backend controlled.


-- =========================================================
-- 21. COMMENTS
-- =========================================================

comment on table public.payments is
    'Customer payment records for WASSLHA orders.';

comment on table public.payment_transactions is
    'Provider/payment transaction events with idempotency protection.';

comment on table public.wallets is
    'User wallet balances maintained in MAD minor units.';

comment on table public.wallet_transactions is
    'Immutable wallet transaction history.';

comment on table public.financial_ledger is
    'Append-only financial ledger for traceable order economics.';

comment on table public.merchant_settlements is
    'Merchant settlement periods and payable amounts.';

comment on table public.rider_earnings is
    'Rider delivery earnings and adjustments.';

comment on table public.rider_withdrawals is
    'Rider withdrawal requests and processing state.';

comment on table public.refunds is
    'Order refund requests and execution records.';


commit;
