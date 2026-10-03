-- WASSLHA
-- Migration #68
-- Growth Foundation
-- Berrechid MVP
--
-- Covers:
-- - Promotions
-- - Promo Codes
-- - Promo Redemptions
-- - Referrals
-- - Loyalty Accounts
-- - Loyalty Transactions
--
-- Financial values use integer minor units (centimes).
-- Loyalty points are integer units.
-- Growth operations must remain traceable and idempotent.

begin;

-- =========================================================
-- 1. PROMOTIONS
-- =========================================================

create table if not exists public.promotions (
    id uuid primary key default gen_random_uuid(),

    name text not null,
    description text,

    promotion_type text not null
        check (
            promotion_type in (
                'percentage_discount',
                'fixed_discount',
                'free_delivery',
                'product_discount',
                'order_discount'
            )
        ),

    discount_percent numeric(5,2),
    discount_amount_minor bigint,

    minimum_order_amount_minor bigint default 0,
    maximum_discount_amount_minor bigint,

    usage_limit integer,
    usage_limit_per_user integer,

    starts_at timestamptz not null,
    ends_at timestamptz not null,

    is_active boolean not null default true,

    conditions jsonb not null default '{}'::jsonb,

    created_by uuid
        references public.users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint promotions_dates_valid
        check (ends_at > starts_at),

    constraint promotions_minimum_nonnegative
        check (minimum_order_amount_minor >= 0),

    constraint promotions_discount_amount_nonnegative
        check (
            discount_amount_minor is null
            or discount_amount_minor > 0
        ),

    constraint promotions_max_discount_nonnegative
        check (
            maximum_discount_amount_minor is null
            or maximum_discount_amount_minor > 0
        ),

    constraint promotions_percent_valid
        check (
            discount_percent is null
            or (
                discount_percent > 0
                and discount_percent <= 100
            )
        ),

    constraint promotions_usage_limit_valid
        check (
            usage_limit is null
            or usage_limit > 0
        ),

    constraint promotions_usage_per_user_valid
        check (
            usage_limit_per_user is null
            or usage_limit_per_user > 0
        )
);

create index if not exists promotions_active_dates_idx
    on public.promotions (is_active, starts_at, ends_at);


-- =========================================================
-- 2. PROMO CODES
-- =========================================================

create table if not exists public.promo_codes (
    id uuid primary key default gen_random_uuid(),

    promotion_id uuid not null
        references public.promotions(id) on delete restrict,

    code text not null,

    is_active boolean not null default true,

    usage_limit integer,
    usage_count integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint promo_codes_code_not_empty
        check (length(trim(code)) > 0),

    constraint promo_codes_usage_limit_valid
        check (
            usage_limit is null
            or usage_limit > 0
        ),

    constraint promo_codes_usage_count_valid
        check (usage_count >= 0)
);

create unique index if not exists promo_codes_code_unique_idx
    on public.promo_codes (lower(code));

create index if not exists promo_codes_promotion_idx
    on public.promo_codes (promotion_id);


-- =========================================================
-- 3. PROMO REDEMPTIONS
-- =========================================================

create table if not exists public.promo_redemptions (
    id uuid primary key default gen_random_uuid(),

    promotion_id uuid not null
        references public.promotions(id) on delete restrict,

    promo_code_id uuid
        references public.promo_codes(id) on delete restrict,

    user_id uuid not null
        references public.users(id) on delete restrict,

    master_order_id uuid not null
        references public.master_orders(id) on delete restrict,

    discount_amount_minor bigint not null,

    currency text not null default 'MAD',

    idempotency_key text not null unique,

    created_at timestamptz not null default now(),

    constraint promo_redemptions_discount_positive
        check (discount_amount_minor > 0),

    constraint promo_redemptions_currency_mad
        check (currency = 'MAD')
);

create index if not exists promo_redemptions_user_idx
    on public.promo_redemptions (user_id, created_at desc);

create index if not exists promo_redemptions_promotion_idx
    on public.promo_redemptions (promotion_id, created_at desc);

create index if not exists promo_redemptions_order_idx
    on public.promo_redemptions (master_order_id);


-- =========================================================
-- 4. REFERRALS
-- =========================================================

create table if not exists public.referrals (
    id uuid primary key default gen_random_uuid(),

    referrer_id uuid not null
        references public.users(id) on delete restrict,

    referred_user_id uuid not null
        references public.users(id) on delete restrict,

    referral_code text not null,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'qualified',
                'rewarded',
                'cancelled'
            )
        ),

    reward_amount_minor bigint default 0,

    reward_currency text not null default 'MAD',

    qualified_order_id uuid
        references public.master_orders(id) on delete restrict,

    rewarded_at timestamptz,

    idempotency_key text not null unique,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint referrals_users_different
        check (referrer_id <> referred_user_id),

    constraint referrals_reward_nonnegative
        check (reward_amount_minor >= 0),

    constraint referrals_currency_mad
        check (reward_currency = 'MAD')
);

create unique index if not exists referrals_referred_user_unique_idx
    on public.referrals (referred_user_id);

create index if not exists referrals_referrer_idx
    on public.referrals (referrer_id, created_at desc);

create index if not exists referrals_code_idx
    on public.referrals (referral_code);


-- =========================================================
-- 5. LOYALTY ACCOUNTS
-- =========================================================

create table if not exists public.loyalty_accounts (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete restrict,

    points_balance bigint not null default 0,

    lifetime_earned_points bigint not null default 0,
    lifetime_redeemed_points bigint not null default 0,

    status text not null default 'active'
        check (
            status in (
                'active',
                'suspended',
                'closed'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint loyalty_balance_nonnegative
        check (points_balance >= 0),

    constraint loyalty_lifetime_earned_nonnegative
        check (lifetime_earned_points >= 0),

    constraint loyalty_lifetime_redeemed_nonnegative
        check (lifetime_redeemed_points >= 0)
);

create unique index if not exists loyalty_accounts_user_unique_idx
    on public.loyalty_accounts (user_id);

create index if not exists loyalty_accounts_status_idx
    on public.loyalty_accounts (status);


-- =========================================================
-- 6. LOYALTY TRANSACTIONS
-- =========================================================

create table if not exists public.loyalty_transactions (
    id uuid primary key default gen_random_uuid(),

    loyalty_account_id uuid not null
        references public.loyalty_accounts(id) on delete restrict,

    transaction_type text not null
        check (
            transaction_type in (
                'earn',
                'redeem',
                'bonus',
                'adjustment',
                'expiration',
                'reversal'
            )
        ),

    points integer not null,

    balance_before bigint not null,
    balance_after bigint not null,

    reference_type text,
    reference_id uuid,

    idempotency_key text not null unique,

    description text,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint loyalty_transactions_points_positive
        check (points > 0),

    constraint loyalty_transactions_balance_before_nonnegative
        check (balance_before >= 0),

    constraint loyalty_transactions_balance_after_nonnegative
        check (balance_after >= 0)
);

create index if not exists loyalty_transactions_account_idx
    on public.loyalty_transactions (
        loyalty_account_id,
        created_at desc
    );

create index if not exists loyalty_transactions_reference_idx
    on public.loyalty_transactions (
        reference_type,
        reference_id
    );


-- =========================================================
-- 7. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists promotions_set_updated_at
    on public.promotions;

create trigger promotions_set_updated_at
before update on public.promotions
for each row
execute function public.set_updated_at();


drop trigger if exists promo_codes_set_updated_at
    on public.promo_codes;

create trigger promo_codes_set_updated_at
before update on public.promo_codes
for each row
execute function public.set_updated_at();


drop trigger if exists referrals_set_updated_at
    on public.referrals;

create trigger referrals_set_updated_at
before update on public.referrals
for each row
execute function public.set_updated_at();


drop trigger if exists loyalty_accounts_set_updated_at
    on public.loyalty_accounts;

create trigger loyalty_accounts_set_updated_at
before update on public.loyalty_accounts
for each row
execute function public.set_updated_at();


-- =========================================================
-- 8. ENABLE RLS
-- =========================================================

alter table public.promotions enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.referrals enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;


-- =========================================================
-- 9. PROMOTIONS RLS
-- =========================================================

drop policy if exists promotions_select_active_authenticated
    on public.promotions;

create policy promotions_select_active_authenticated
on public.promotions
for select
to authenticated
using (
    public.has_role('admin')
    or (
        is_active = true
        and now() >= starts_at
        and now() <= ends_at
    )
);


-- Admin controls promotion creation/update/deletion.


-- =========================================================
-- 10. PROMO CODES RLS
-- =========================================================

drop policy if exists promo_codes_select_active_authenticated
    on public.promo_codes;

create policy promo_codes_select_active_authenticated
on public.promo_codes
for select
to authenticated
using (
    public.has_role('admin')
    or is_active = true
);


-- =========================================================
-- 11. PROMO REDEMPTIONS RLS
-- =========================================================

drop policy if exists promo_redemptions_select_own_admin
    on public.promo_redemptions;

create policy promo_redemptions_select_own_admin
on public.promo_redemptions
for select
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
);


-- Redemption writes are backend controlled.


-- =========================================================
-- 12. REFERRALS RLS
-- =========================================================

drop policy if exists referrals_select_participants_admin
    on public.referrals;

create policy referrals_select_participants_admin
on public.referrals
for select
to authenticated
using (
    public.has_role('admin')
    or referrer_id = auth.uid()
    or referred_user_id = auth.uid()
);


-- Referral creation and reward processing are backend controlled.


-- =========================================================
-- 13. LOYALTY ACCOUNTS RLS
-- =========================================================

drop policy if exists loyalty_accounts_select_own_admin
    on public.loyalty_accounts;

create policy loyalty_accounts_select_own_admin
on public.loyalty_accounts
for select
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
);


-- Loyalty balances are backend controlled.


-- =========================================================
-- 14. LOYALTY TRANSACTIONS RLS
-- =========================================================

drop policy if exists loyalty_transactions_select_own_admin
    on public.loyalty_transactions;

create policy loyalty_transactions_select_own_admin
on public.loyalty_transactions
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.loyalty_accounts la
        where la.id = loyalty_transactions.loyalty_account_id
          and la.user_id = auth.uid()
    )
);


-- Loyalty transaction writes are backend controlled.


-- =========================================================
-- 15. COMMENTS
-- =========================================================

comment on table public.promotions is
    'Admin-managed promotion rules for WASSLHA.';

comment on table public.promo_codes is
    'Promo codes linked to promotion rules.';

comment on table public.promo_redemptions is
    'Traceable promotion usage against customer orders.';

comment on table public.referrals is
    'Customer referral relationships and reward state.';

comment on table public.loyalty_accounts is
    'Customer loyalty point balances.';

comment on table public.loyalty_transactions is
    'Immutable loyalty point transaction history.';


commit;
