-- WASSLHA
-- Migration #71
-- Get Request Foundation
-- Berrechid MVP
--
-- Covers:
-- - Get Requests
-- - Get Request Items
-- - Get Request Offers
-- - Get Request Status History
--
-- "جيب ليا" allows customers to request products/services
-- from places that are not registered merchants.
--
-- Sensitive operations are backend controlled.
-- Financial values use integer minor units (centimes).

begin;

-- =========================================================
-- 1. GET REQUESTS
-- =========================================================

create table if not exists public.get_requests (
    id uuid primary key default gen_random_uuid(),

    customer_id uuid not null
        references public.users(id) on delete restrict,

    address_id uuid
        references public.addresses(id) on delete set null,

    master_order_id uuid
        references public.master_orders(id) on delete restrict,

    request_title text not null,

    request_description text,

    pickup_place_name text,

    pickup_place_address text,

    pickup_latitude numeric(10,7),

    pickup_longitude numeric(10,7),

    delivery_address_text text,

    delivery_latitude numeric(10,7),

    delivery_longitude numeric(10,7),

    estimated_product_amount_minor bigint default 0,

    maximum_product_amount_minor bigint,

    delivery_fee_minor bigint default 0,

    service_fee_minor bigint default 0,

    total_estimated_amount_minor bigint default 0,

    currency text not null default 'MAD',

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'searching',
                'accepted',
                'purchasing',
                'picked_up',
                'delivering',
                'delivered',
                'cancelled',
                'rejected',
                'expired'
            )
        ),

    expires_at timestamptz,

    accepted_at timestamptz,

    completed_at timestamptz,

    cancelled_at timestamptz,

    cancellation_reason text,

    idempotency_key text not null unique,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint get_requests_currency_mad
        check (currency = 'MAD'),

    constraint get_requests_estimated_nonnegative
        check (estimated_product_amount_minor >= 0),

    constraint get_requests_maximum_nonnegative
        check (
            maximum_product_amount_minor is null
            or maximum_product_amount_minor >= 0
        ),

    constraint get_requests_delivery_fee_nonnegative
        check (delivery_fee_minor >= 0),

    constraint get_requests_service_fee_nonnegative
        check (service_fee_minor >= 0),

    constraint get_requests_total_nonnegative
        check (total_estimated_amount_minor >= 0),

    constraint get_requests_latitude_valid
        check (
            pickup_latitude is null
            or pickup_latitude between -90 and 90
        ),

    constraint get_requests_longitude_valid
        check (
            pickup_longitude is null
            or pickup_longitude between -180 and 180
        ),

    constraint get_requests_delivery_latitude_valid
        check (
            delivery_latitude is null
            or delivery_latitude between -90 and 90
        ),

    constraint get_requests_delivery_longitude_valid
        check (
            delivery_longitude is null
            or delivery_longitude between -180 and 180
        )
);

create index if not exists get_requests_customer_idx
    on public.get_requests (
        customer_id,
        created_at desc
    );

create index if not exists get_requests_status_idx
    on public.get_requests (
        status,
        created_at asc
    );

create index if not exists get_requests_order_idx
    on public.get_requests (master_order_id);


-- =========================================================
-- 2. GET REQUEST ITEMS
-- =========================================================

create table if not exists public.get_request_items (
    id uuid primary key default gen_random_uuid(),

    get_request_id uuid not null
        references public.get_requests(id) on delete restrict,

    item_name text not null,

    description text,

    quantity numeric(12,3) not null default 1,

    unit text,

    estimated_unit_price_minor bigint,

    maximum_unit_price_minor bigint,

    notes text,

    created_at timestamptz not null default now(),

    constraint get_request_items_quantity_positive
        check (quantity > 0),

    constraint get_request_items_estimated_price_valid
        check (
            estimated_unit_price_minor is null
            or estimated_unit_price_minor >= 0
        ),

    constraint get_request_items_maximum_price_valid
        check (
            maximum_unit_price_minor is null
            or maximum_unit_price_minor >= 0
        )
);

create index if not exists get_request_items_request_idx
    on public.get_request_items (
        get_request_id,
        created_at asc
    );


-- =========================================================
-- 3. GET REQUEST OFFERS
-- =========================================================

create table if not exists public.get_request_offers (
    id uuid primary key default gen_random_uuid(),

    get_request_id uuid not null
        references public.get_requests(id) on delete restrict,

    rider_id uuid
        references public.riders(id) on delete restrict,

    offered_product_amount_minor bigint,

    offered_delivery_fee_minor bigint,

    offered_service_fee_minor bigint,

    offered_total_amount_minor bigint,

    currency text not null default 'MAD',

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'accepted',
                'rejected',
                'expired',
                'withdrawn'
            )
        ),

    message text,

    expires_at timestamptz,

    accepted_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint get_request_offers_currency_mad
        check (currency = 'MAD'),

    constraint get_request_offers_product_nonnegative
        check (
            offered_product_amount_minor is null
            or offered_product_amount_minor >= 0
        ),

    constraint get_request_offers_delivery_nonnegative
        check (
            offered_delivery_fee_minor is null
            or offered_delivery_fee_minor >= 0
        ),

    constraint get_request_offers_service_nonnegative
        check (
            offered_service_fee_minor is null
            or offered_service_fee_minor >= 0
        ),

    constraint get_request_offers_total_nonnegative
        check (
            offered_total_amount_minor is null
            or offered_total_amount_minor >= 0
        )
);

create index if not exists get_request_offers_request_idx
    on public.get_request_offers (
        get_request_id,
        created_at desc
    );

create index if not exists get_request_offers_rider_idx
    on public.get_request_offers (
        rider_id,
        created_at desc
    );

create index if not exists get_request_offers_status_idx
    on public.get_request_offers (
        status,
        created_at asc
    );


-- =========================================================
-- 4. GET REQUEST STATUS HISTORY
-- =========================================================

create table if not exists public.get_request_status_history (
    id uuid primary key default gen_random_uuid(),

    get_request_id uuid not null
        references public.get_requests(id) on delete restrict,

    old_status text,

    new_status text not null,

    changed_by uuid
        references public.users(id) on delete set null,

    reason text,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);

create index if not exists get_request_status_history_request_idx
    on public.get_request_status_history (
        get_request_id,
        created_at asc
    );


-- =========================================================
-- 5. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists get_requests_set_updated_at
    on public.get_requests;

create trigger get_requests_set_updated_at
before update on public.get_requests
for each row
execute function public.set_updated_at();


drop trigger if exists get_request_offers_set_updated_at
    on public.get_request_offers;

create trigger get_request_offers_set_updated_at
before update on public.get_request_offers
for each row
execute function public.set_updated_at();


-- =========================================================
-- 6. ENABLE RLS
-- =========================================================

alter table public.get_requests enable row level security;
alter table public.get_request_items enable row level security;
alter table public.get_request_offers enable row level security;
alter table public.get_request_status_history enable row level security;


-- =========================================================
-- 7. GET REQUESTS RLS
-- =========================================================

drop policy if exists get_requests_select_own_admin
    on public.get_requests;

create policy get_requests_select_own_admin
on public.get_requests
for select
to authenticated
using (
    public.has_role('admin')
    or customer_id = auth.uid()
);


-- Get request creation and lifecycle updates
-- are backend controlled.


-- =========================================================
-- 8. GET REQUEST ITEMS RLS
-- =========================================================

drop policy if exists get_request_items_select_owner_admin
    on public.get_request_items;

create policy get_request_items_select_owner_admin
on public.get_request_items
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.get_requests gr
        where gr.id = get_request_items.get_request_id
          and gr.customer_id = auth.uid()
    )
);


-- Item writes are backend controlled.


-- =========================================================
-- 9. GET REQUEST OFFERS RLS
-- =========================================================

drop policy if exists get_request_offers_select_customer_rider_admin
    on public.get_request_offers;

create policy get_request_offers_select_customer_rider_admin
on public.get_request_offers
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.get_requests gr
        where gr.id = get_request_offers.get_request_id
          and gr.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.riders r
        where r.id = get_request_offers.rider_id
          and r.user_id = auth.uid()
    )
);


-- Offer creation and acceptance are backend controlled.


-- =========================================================
-- 10. GET REQUEST STATUS HISTORY RLS
-- =========================================================

drop policy if exists get_request_status_history_select_owner_admin
    on public.get_request_status_history;

create policy get_request_status_history_select_owner_admin
on public.get_request_status_history
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.get_requests gr
        where gr.id = get_request_status_history.get_request_id
          and gr.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.get_request_offers gro
        join public.riders r
            on r.id = gro.rider_id
        where gro.get_request_id = get_request_status_history.get_request_id
          and r.user_id = auth.uid()
    )
);


-- Status history is append-only.
-- Writes are backend controlled.


-- =========================================================
-- 11. COMMENTS
-- =========================================================

comment on table public.get_requests is
    'Customer "جيب ليا" requests for purchasing or collecting products from non-registered places.';

comment on table public.get_request_items is
    'Requested products and quantities inside a "جيب ليا" request.';

comment on table public.get_request_offers is
    'Rider offers and estimated costs for fulfilling a "جيب ليا" request.';

comment on table public.get_request_status_history is
    'Append-only status history for "جيب ليا" requests.';


-- =========================================================
-- 12. FINALIZE MIGRATION
-- =========================================================

commit;
