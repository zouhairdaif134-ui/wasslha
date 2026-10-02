-- WASSLHA
-- Migration #64
-- Order Foundation
-- Berrechid MVP
--
-- Scope:
-- master_orders
-- sub_orders
-- order_items
-- order_item_variants
-- order_status_history
-- cancellations
-- substitutions

begin;

-- =========================================================
-- 1. MASTER ORDERS
-- =========================================================

create table if not exists public.master_orders (
    id uuid primary key default gen_random_uuid(),

    customer_id uuid not null
        references public.users(id) on delete restrict,

    delivery_address_id uuid not null
        references public.addresses(id) on delete restrict,

    order_number text not null unique,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'confirmed',
                'preparing',
                'ready_for_pickup',
                'assigned',
                'picked_up',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'refunded'
            )
        ),

    payment_method text not null default 'cod'
        check (
            payment_method in (
                'cod',
                'online'
            )
        ),

    payment_status text not null default 'pending'
        check (
            payment_status in (
                'pending',
                'authorized',
                'paid',
                'failed',
                'partially_refunded',
                'refunded'
            )
        ),

    currency text not null default 'MAD',

    subtotal_minor integer not null default 0,
    delivery_fee_minor integer not null default 0,
    discount_minor integer not null default 0,
    total_minor integer not null default 0,

    customer_note text,

    placed_at timestamptz,
    confirmed_at timestamptz,
    delivered_at timestamptz,
    cancelled_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint master_orders_currency_mad
        check (currency = 'MAD'),

    constraint master_orders_subtotal_nonnegative
        check (subtotal_minor >= 0),

    constraint master_orders_delivery_fee_nonnegative
        check (delivery_fee_minor >= 0),

    constraint master_orders_discount_nonnegative
        check (discount_minor >= 0),

    constraint master_orders_total_nonnegative
        check (total_minor >= 0)
);

create index if not exists master_orders_customer_id_idx
    on public.master_orders (customer_id);

create index if not exists master_orders_status_idx
    on public.master_orders (status);

create index if not exists master_orders_created_at_idx
    on public.master_orders (created_at desc);


-- =========================================================
-- 2. SUB ORDERS
-- =========================================================

create table if not exists public.sub_orders (
    id uuid primary key default gen_random_uuid(),

    master_order_id uuid not null
        references public.master_orders(id) on delete restrict,

    store_id uuid not null
        references public.stores(id) on delete restrict,

    sub_order_number text not null unique,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'confirmed',
                'preparing',
                'ready_for_pickup',
                'assigned',
                'picked_up',
                'out_for_delivery',
                'delivered',
                'cancelled'
            )
        ),

    subtotal_minor integer not null default 0,
    discount_minor integer not null default 0,
    total_minor integer not null default 0,

    merchant_note text,

    confirmed_at timestamptz,
    ready_at timestamptz,
    delivered_at timestamptz,
    cancelled_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint sub_orders_subtotal_nonnegative
        check (subtotal_minor >= 0),

    constraint sub_orders_discount_nonnegative
        check (discount_minor >= 0),

    constraint sub_orders_total_nonnegative
        check (total_minor >= 0)
);

create index if not exists sub_orders_master_order_id_idx
    on public.sub_orders (master_order_id);

create index if not exists sub_orders_store_id_idx
    on public.sub_orders (store_id);

create index if not exists sub_orders_status_idx
    on public.sub_orders (status);


-- =========================================================
-- 3. ORDER ITEMS
-- =========================================================

create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),

    sub_order_id uuid not null
        references public.sub_orders(id) on delete restrict,

    product_id uuid not null
        references public.products(id) on delete restrict,

    product_name_ar text not null,
    product_name_fr text not null,

    quantity numeric(12,3) not null,

    unit_price_minor integer not null,
    line_total_minor integer not null,

    notes text,

    created_at timestamptz not null default now(),

    constraint order_items_quantity_positive
        check (quantity > 0),

    constraint order_items_unit_price_nonnegative
        check (unit_price_minor >= 0),

    constraint order_items_line_total_nonnegative
        check (line_total_minor >= 0)
);

create index if not exists order_items_sub_order_id_idx
    on public.order_items (sub_order_id);

create index if not exists order_items_product_id_idx
    on public.order_items (product_id);


-- =========================================================
-- 4. ORDER ITEM VARIANTS
-- =========================================================

create table if not exists public.order_item_variants (
    id uuid primary key default gen_random_uuid(),

    order_item_id uuid not null
        references public.order_items(id) on delete restrict,

    product_variant_id uuid not null
        references public.product_variants(id) on delete restrict,

    variant_name_ar text not null,
    variant_name_fr text not null,

    quantity numeric(12,3) not null default 1,

    unit_price_minor integer not null,
    total_minor integer not null,

    created_at timestamptz not null default now(),

    constraint order_item_variants_quantity_positive
        check (quantity > 0),

    constraint order_item_variants_unit_price_nonnegative
        check (unit_price_minor >= 0),

    constraint order_item_variants_total_nonnegative
        check (total_minor >= 0)
);

create index if not exists order_item_variants_order_item_id_idx
    on public.order_item_variants (order_item_id);

create index if not exists order_item_variants_product_variant_id_idx
    on public.order_item_variants (product_variant_id);


-- =========================================================
-- 5. ORDER STATUS HISTORY
-- =========================================================

create table if not exists public.order_status_history (
    id uuid primary key default gen_random_uuid(),

    master_order_id uuid not null
        references public.master_orders(id) on delete restrict,

    sub_order_id uuid
        references public.sub_orders(id) on delete restrict,

    old_status text,
    new_status text not null,

    changed_by uuid
        references public.users(id) on delete set null,

    reason text,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);

create index if not exists order_status_history_master_order_idx
    on public.order_status_history (master_order_id, created_at);

create index if not exists order_status_history_sub_order_idx
    on public.order_status_history (sub_order_id, created_at);


-- =========================================================
-- 6. CANCELLATIONS
-- =========================================================

create table if not exists public.cancellations (
    id uuid primary key default gen_random_uuid(),

    master_order_id uuid
        references public.master_orders(id) on delete restrict,

    sub_order_id uuid
        references public.sub_orders(id) on delete restrict,

    cancelled_by uuid
        references public.users(id) on delete set null,

    reason_code text not null,

    reason_text text,

    refund_required boolean not null default false,

    created_at timestamptz not null default now(),

    constraint cancellations_order_reference
        check (
            master_order_id is not null
            or sub_order_id is not null
        )
);

create index if not exists cancellations_master_order_idx
    on public.cancellations (master_order_id);

create index if not exists cancellations_sub_order_idx
    on public.cancellations (sub_order_id);


-- =========================================================
-- 7. SUBSTITUTIONS
-- =========================================================

create table if not exists public.substitutions (
    id uuid primary key default gen_random_uuid(),

    order_item_id uuid not null
        references public.order_items(id) on delete restrict,

    original_product_id uuid not null
        references public.products(id) on delete restrict,

    replacement_product_id uuid
        references public.products(id) on delete restrict,

    original_quantity numeric(12,3) not null,
    replacement_quantity numeric(12,3),

    status text not null default 'proposed'
        check (
            status in (
                'proposed',
                'accepted',
                'rejected',
                'cancelled'
            )
        ),

    proposed_by uuid
        references public.users(id) on delete set null,

    customer_response_at timestamptz,

    reason text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint substitutions_original_quantity_positive
        check (original_quantity > 0),

    constraint substitutions_replacement_quantity_positive
        check (
            replacement_quantity is null
            or replacement_quantity > 0
        )
);

create index if not exists substitutions_order_item_id_idx
    on public.substitutions (order_item_id);

create index if not exists substitutions_status_idx
    on public.substitutions (status);


-- =========================================================
-- 8. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists master_orders_set_updated_at
    on public.master_orders;

create trigger master_orders_set_updated_at
before update on public.master_orders
for each row
execute function public.set_updated_at();


drop trigger if exists sub_orders_set_updated_at
    on public.sub_orders;

create trigger sub_orders_set_updated_at
before update on public.sub_orders
for each row
execute function public.set_updated_at();


drop trigger if exists substitutions_set_updated_at
    on public.substitutions;

create trigger substitutions_set_updated_at
before update on public.substitutions
for each row
execute function public.set_updated_at();


-- =========================================================
-- 9. ENABLE RLS
-- =========================================================

alter table public.master_orders enable row level security;
alter table public.sub_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_variants enable row level security;
alter table public.order_status_history enable row level security;
alter table public.cancellations enable row level security;
alter table public.substitutions enable row level security;


-- =========================================================
-- 10. MASTER ORDERS RLS
-- =========================================================

drop policy if exists master_orders_select_customer_admin
    on public.master_orders;

create policy master_orders_select_customer_admin
on public.master_orders
for select
to authenticated
using (
    customer_id = auth.uid()
    or public.has_role('admin')
);


drop policy if exists master_orders_insert_customer
    on public.master_orders;

create policy master_orders_insert_customer
on public.master_orders
for insert
to authenticated
with check (
    customer_id = auth.uid()
);


-- No direct client update/delete policy.
-- Order state changes will be controlled by backend workflows.


-- =========================================================
-- 11. SUB ORDERS RLS
-- =========================================================

drop policy if exists sub_orders_select_customer_merchant_admin
    on public.sub_orders;

create policy sub_orders_select_customer_merchant_admin
on public.sub_orders
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.master_orders mo
        where mo.id = sub_orders.master_order_id
          and mo.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.stores s
        join public.merchants m
            on m.id = s.merchant_id
        where s.id = sub_orders.store_id
          and m.user_id = auth.uid()
    )
);


-- =========================================================
-- 12. ORDER ITEMS RLS
-- =========================================================

drop policy if exists order_items_select_authorized
    on public.order_items;

create policy order_items_select_authorized
on public.order_items
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.sub_orders so
        join public.master_orders mo
            on mo.id = so.master_order_id
        where so.id = order_items.sub_order_id
          and mo.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.sub_orders so
        join public.stores s
            on s.id = so.store_id
        join public.merchants m
            on m.id = s.merchant_id
        where so.id = order_items.sub_order_id
          and m.user_id = auth.uid()
    )
);


-- =========================================================
-- 13. ORDER ITEM VARIANTS RLS
-- =========================================================

drop policy if exists order_item_variants_select_authorized
    on public.order_item_variants;

create policy order_item_variants_select_authorized
on public.order_item_variants
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.order_items oi
        join public.sub_orders so
            on so.id = oi.sub_order_id
        join public.master_orders mo
            on mo.id = so.master_order_id
        where oi.id = order_item_variants.order_item_id
          and mo.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.order_items oi
        join public.sub_orders so
            on so.id = oi.sub_order_id
        join public.stores s
            on s.id = so.store_id
        join public.merchants m
            on m.id = s.merchant_id
        where oi.id = order_item_variants.order_item_id
          and m.user_id = auth.uid()
    )
);


-- =========================================================
-- 14. ORDER STATUS HISTORY RLS
-- =========================================================

drop policy if exists order_status_history_select_authorized
    on public.order_status_history;

create policy order_status_history_select_authorized
on public.order_status_history
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.master_orders mo
        where mo.id = order_status_history.master_order_id
          and mo.customer_id = auth.uid()
    )
);


-- No client INSERT/UPDATE/DELETE.
-- Status history is append-only through backend/state-machine logic.


-- =========================================================
-- 15. CANCELLATIONS RLS
-- =========================================================

drop policy if exists cancellations_select_authorized
    on public.cancellations;

create policy cancellations_select_authorized
on public.cancellations
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.master_orders mo
        where mo.id = cancellations.master_order_id
          and mo.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.sub_orders so
        join public.master_orders mo
            on mo.id = so.master_order_id
        where so.id = cancellations.sub_order_id
          and mo.customer_id = auth.uid()
    )
);


-- =========================================================
-- 16. SUBSTITUTIONS RLS
-- =========================================================

drop policy if exists substitutions_select_authorized
    on public.substitutions;

create policy substitutions_select_authorized
on public.substitutions
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.order_items oi
        join public.sub_orders so
            on so.id = oi.sub_order_id
        join public.master_orders mo
            on mo.id = so.master_order_id
        where oi.id = substitutions.order_item_id
          and mo.customer_id = auth.uid()
    )
);


-- =========================================================
-- 17. COMMENTS
-- =========================================================

comment on table public.master_orders is
    'Customer master order. May contain multiple store sub-orders.';

comment on table public.sub_orders is
    'Store-specific portion of a master order.';

comment on table public.order_items is
    'Immutable snapshot of products purchased in an order.';

comment on table public.order_item_variants is
    'Selected product variants captured as order snapshots.';

comment on table public.order_status_history is
    'Append-only order state transition history.';

comment on table public.cancellations is
    'Order cancellation records; financial corrections must use refunds/reversals.';

comment on table public.substitutions is
    'Product substitution proposals and customer responses.';


commit;
