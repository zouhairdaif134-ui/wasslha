-- WASSLHA
-- Migration #63
-- Commerce Foundation
-- Berrechid MVP
--
-- Scope:
-- merchants
-- stores
-- categories
-- products
-- product_variants
-- product_images

begin;

-- =========================================================
-- 1. MERCHANTS
-- =========================================================

create table if not exists public.merchants (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete restrict,

    business_name text not null,
    legal_name text,

    phone text,
    email text,

    status text not null default 'pending'
        check (status in ('pending', 'approved', 'suspended', 'rejected')),

    rejection_reason text,

    approved_at timestamptz,
    approved_by uuid references public.users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint merchants_business_name_length
        check (char_length(business_name) between 2 and 200)
);

create index if not exists merchants_user_id_idx
    on public.merchants (user_id);

create index if not exists merchants_status_idx
    on public.merchants (status);


-- =========================================================
-- 2. STORES
-- =========================================================

create table if not exists public.stores (
    id uuid primary key default gen_random_uuid(),

    merchant_id uuid not null
        references public.merchants(id) on delete restrict,

    name text not null,
    description text,

    phone text,

    address_text text not null,
    latitude numeric(9,6),
    longitude numeric(9,6),

    is_active boolean not null default true,
    is_accepting_orders boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint stores_name_length
        check (char_length(name) between 2 and 200),

    constraint stores_address_length
        check (char_length(address_text) between 2 and 500),

    constraint stores_latitude_range
        check (latitude is null or latitude between -90 and 90),

    constraint stores_longitude_range
        check (longitude is null or longitude between -180 and 180)
);

create index if not exists stores_merchant_id_idx
    on public.stores (merchant_id);

create index if not exists stores_active_idx
    on public.stores (is_active);


-- =========================================================
-- 3. CATEGORIES
-- =========================================================

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),

    parent_id uuid references public.categories(id) on delete restrict,

    name_ar text not null,
    name_fr text not null,

    slug text not null unique,

    is_active boolean not null default true,
    sort_order integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint categories_name_ar_length
        check (char_length(name_ar) between 1 and 150),

    constraint categories_name_fr_length
        check (char_length(name_fr) between 1 and 150),

    constraint categories_slug_format
        check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

    constraint categories_sort_order_nonnegative
        check (sort_order >= 0)
);

create index if not exists categories_parent_id_idx
    on public.categories (parent_id);

create index if not exists categories_active_sort_idx
    on public.categories (is_active, sort_order);


-- =========================================================
-- 4. PRODUCTS
-- =========================================================

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),

    store_id uuid not null
        references public.stores(id) on delete restrict,

    category_id uuid
        references public.categories(id) on delete set null,

    name_ar text not null,
    name_fr text not null,

    description_ar text,
    description_fr text,

    sku text,

    price_minor integer not null,
    compare_at_price_minor integer,

    currency text not null default 'MAD',

    stock_quantity numeric(12,3) not null default 0,
    stock_unit text not null default 'unit',

    is_available boolean not null default false,
    is_active boolean not null default true,

    approval_status text not null default 'pending'
        check (approval_status in ('pending', 'approved', 'rejected')),

    rejection_reason text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint products_name_ar_length
        check (char_length(name_ar) between 1 and 250),

    constraint products_name_fr_length
        check (char_length(name_fr) between 1 and 250),

    constraint products_price_nonnegative
        check (price_minor >= 0),

    constraint products_compare_price_nonnegative
        check (
            compare_at_price_minor is null
            or compare_at_price_minor >= 0
        ),

    constraint products_stock_nonnegative
        check (stock_quantity >= 0),

    constraint products_currency_mad
        check (currency = 'MAD'),

    constraint products_stock_unit_valid
        check (
            stock_unit in (
                'unit',
                'kg',
                'g',
                'liter',
                'ml'
            )
        )
);

create index if not exists products_store_id_idx
    on public.products (store_id);

create index if not exists products_category_id_idx
    on public.products (category_id);

create index if not exists products_available_idx
    on public.products (is_active, is_available);

create unique index if not exists products_store_sku_unique_idx
    on public.products (store_id, sku)
    where sku is not null;


-- =========================================================
-- 5. PRODUCT VARIANTS
-- =========================================================

create table if not exists public.product_variants (
    id uuid primary key default gen_random_uuid(),

    product_id uuid not null
        references public.products(id) on delete restrict,

    name_ar text not null,
    name_fr text not null,

    sku text,

    price_minor integer not null,

    stock_quantity numeric(12,3) not null default 0,

    is_available boolean not null default true,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint product_variants_name_ar_length
        check (char_length(name_ar) between 1 and 150),

    constraint product_variants_name_fr_length
        check (char_length(name_fr) between 1 and 150),

    constraint product_variants_price_nonnegative
        check (price_minor >= 0),

    constraint product_variants_stock_nonnegative
        check (stock_quantity >= 0)
);

create index if not exists product_variants_product_id_idx
    on public.product_variants (product_id);

create unique index if not exists product_variants_sku_unique_idx
    on public.product_variants (product_id, sku)
    where sku is not null;


-- =========================================================
-- 6. PRODUCT IMAGES
-- =========================================================

create table if not exists public.product_images (
    id uuid primary key default gen_random_uuid(),

    product_id uuid not null
        references public.products(id) on delete restrict,

    storage_path text not null,

    alt_text_ar text,
    alt_text_fr text,

    sort_order integer not null default 0,

    is_primary boolean not null default false,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),

    constraint product_images_sort_order_nonnegative
        check (sort_order >= 0)
);

create index if not exists product_images_product_id_idx
    on public.product_images (product_id);

create unique index if not exists product_images_one_primary_idx
    on public.product_images (product_id)
    where is_primary = true and is_active = true;


-- =========================================================
-- 7. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists merchants_set_updated_at
    on public.merchants;

create trigger merchants_set_updated_at
before update on public.merchants
for each row
execute function public.set_updated_at();


drop trigger if exists stores_set_updated_at
    on public.stores;

create trigger stores_set_updated_at
before update on public.stores
for each row
execute function public.set_updated_at();


drop trigger if exists categories_set_updated_at
    on public.categories;

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();


drop trigger if exists products_set_updated_at
    on public.products;

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();


drop trigger if exists product_variants_set_updated_at
    on public.product_variants;

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row
execute function public.set_updated_at();


-- =========================================================
-- 8. ENABLE RLS
-- =========================================================

alter table public.merchants enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;


-- =========================================================
-- 9. MERCHANT RLS
-- =========================================================

drop policy if exists merchants_select_own
    on public.merchants;

create policy merchants_select_own
on public.merchants
for select
to authenticated
using (
    user_id = auth.uid()
    or public.has_role('admin')
);


drop policy if exists merchants_insert_own
    on public.merchants;

create policy merchants_insert_own
on public.merchants
for insert
to authenticated
with check (
    user_id = auth.uid()
);


drop policy if exists merchants_update_own
    on public.merchants;

create policy merchants_update_own
on public.merchants
for update
to authenticated
using (
    user_id = auth.uid()
    or public.has_role('admin')
)
with check (
    user_id = auth.uid()
    or public.has_role('admin')
);


-- =========================================================
-- 10. STORE RLS
-- =========================================================

drop policy if exists stores_select_public
    on public.stores;

create policy stores_select_public
on public.stores
for select
to anon, authenticated
using (
    is_active = true
    and exists (
        select 1
        from public.merchants m
        where m.id = stores.merchant_id
          and m.status = 'approved'
          and m.user_id is not null
    )
);


drop policy if exists stores_select_owner_admin
    on public.stores;

create policy stores_select_owner_admin
on public.stores
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.merchants m
        where m.id = stores.merchant_id
          and m.user_id = auth.uid()
    )
);


drop policy if exists stores_insert_owner
    on public.stores;

create policy stores_insert_owner
on public.stores
for insert
to authenticated
with check (
    exists (
        select 1
        from public.merchants m
        where m.id = merchant_id
          and m.user_id = auth.uid()
    )
);


drop policy if exists stores_update_owner_admin
    on public.stores;

create policy stores_update_owner_admin
on public.stores
for update
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.merchants m
        where m.id = stores.merchant_id
          and m.user_id = auth.uid()
    )
)
with check (
    public.has_role('admin')
    or exists (
        select 1
        from public.merchants m
        where m.id = stores.merchant_id
          and m.user_id = auth.uid()
    )
);


-- =========================================================
-- 11. CATEGORY RLS
-- =========================================================

drop policy if exists categories_select_active
    on public.categories;

create policy categories_select_active
on public.categories
for select
to anon, authenticated
using (
    is_active = true
);


drop policy if exists categories_admin_manage
    on public.categories;

create policy categories_admin_manage
on public.categories
for all
to authenticated
using (
    public.has_role('admin')
)
with check (
    public.has_role('admin')
);


-- =========================================================
-- 12. PRODUCT RLS
-- =========================================================

drop policy if exists products_select_public
    on public.products;

create policy products_select_public
on public.products
for select
to anon, authenticated
using (
    is_active = true
    and is_available = true
    and approval_status = 'approved'
    and exists (
        select 1
        from public.stores s
        join public.merchants m
            on m.id = s.merchant_id
        where s.id = products.store_id
          and s.is_active = true
          and m.status = 'approved'
    )
);


drop policy if exists products_select_owner_admin
    on public.products;

create policy products_select_owner_admin
on public.products
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.stores s
        join public.merchants m
            on m.id = s.merchant_id
        where s.id = products.store_id
          and m.user_id = auth.uid()
    )
);


drop policy if exists products_insert_owner
    on public.products;

create policy products_insert_owner
on public.products
for insert
to authenticated
with check (
    exists (
        select 1
        from public.stores s
        join public.merchants m
            on m.id = s.merchant_id
        where s.id = store_id
          and m.user_id = auth.uid()
    )
);


drop policy if exists products_update_owner_admin
    on public.products;

create policy products_update_owner_admin
on public.products
for update
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.stores s
        join public.merchants m
            on m.id = s.merchant_id
        where s.id = products.store_id
          and m.user_id = auth.uid()
    )
)
with check (
    public.has_role('admin')
    or exists (
        select 1
        from public.stores s
        join public.merchants m
            on m.id = stores.store_id
        where s.id = store_id
          and m.user_id = auth.uid()
    )
);


-- =========================================================
-- 13. PRODUCT VARIANTS RLS
-- =========================================================

drop policy if exists product_variants_select_public
    on public.product_variants;

create policy product_variants_select_public
on public.product_variants
for select
to anon, authenticated
using (
    is_active = true
    and is_available = true
    and exists (
        select 1
        from public.products p
        join public.stores s
            on s.id = p.store_id
        join public.merchants m
            on m.id = s.merchant_id
        where p.id = product_variants.product_id
          and p.is_active = true
          and p.is_available = true
          and p.approval_status = 'approved'
          and s.is_active = true
          and m.status = 'approved'
    )
);


drop policy if exists product_variants_manage_owner_admin
    on public.product_variants;

create policy product_variants_manage_owner_admin
on public.product_variants
for all
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.products p
        join public.stores s
            on s.id = p.store_id
        join public.merchants m
            on m.id = s.merchant_id
        where p.id = product_variants.product_id
          and m.user_id = auth.uid()
    )
)
with check (
    public.has_role('admin')
    or exists (
        select 1
        from public.products p
        join public.stores s
            on s.id = p.store_id
        join public.merchants m
            on m.id = s.merchant_id
        where p.id = product_variants.product_id
          and m.user_id = auth.uid()
    )
);


-- =========================================================
-- 14. PRODUCT IMAGES RLS
-- =========================================================

drop policy if exists product_images_select_public
    on public.product_images;

create policy product_images_select_public
on public.product_images
for select
to anon, authenticated
using (
    is_active = true
    and exists (
        select 1
        from public.products p
        join public.stores s
            on s.id = p.store_id
        join public.merchants m
            on m.id = s.merchant_id
        where p.id = product_images.product_id
          and p.is_active = true
          and p.approval_status = 'approved'
          and s.is_active = true
          and m.status = 'approved'
    )
);


drop policy if exists product_images_manage_owner_admin
    on public.product_images;

create policy product_images_manage_owner_admin
on public.product_images
for all
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.products p
        join public.stores s
            on s.id = p.store_id
        join public.merchants m
            on m.id = s.merchant_id
        where p.id = product_images.product_id
          and m.user_id = auth.uid()
    )
)
with check (
    public.has_role('admin')
    or exists (
        select 1
        from public.products p
        join public.stores s
            on s.id = p.store_id
        join public.merchants m
            on m.id = s.merchant_id
        where p.id = product_images.product_id
          and m.user_id = auth.uid()
    )
);


-- =========================================================
-- 15. COMMENTS
-- =========================================================

comment on table public.merchants is
    'Merchant businesses registered on WASSLHA.';

comment on table public.stores is
    'Merchant stores and their operational locations.';

comment on table public.categories is
    'Admin-managed product categories.';

comment on table public.products is
    'Products offered by approved WASSLHA stores. Prices are stored in MAD centimes.';

comment on table public.product_variants is
    'Product variants with independent prices and stock.';

comment on table public.product_images is
    'Product image references stored through the configured storage layer.';


commit;
