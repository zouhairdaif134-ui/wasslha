-- WASSLHA
-- Migration #62
-- Identity Foundation
-- Berrechid MVP
--
-- Source of truth:
-- WASSLHA Master Product & Technical Specification v1.0
--
-- Scope:
-- users
-- roles
-- user_roles
-- addresses
-- basic Identity RLS

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- 1. USERS
-- =========================================================

create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,

    phone text,
    full_name text,
    preferred_language text not null default 'ar'
        check (preferred_language in ('ar', 'fr')),

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint users_phone_length
        check (phone is null or char_length(phone) between 8 and 30),

    constraint users_full_name_length
        check (full_name is null or char_length(full_name) between 1 and 150)
);

create unique index if not exists users_phone_unique_idx
    on public.users (phone)
    where phone is not null;


-- =========================================================
-- 2. ROLES
-- =========================================================

create table if not exists public.roles (
    id uuid primary key default gen_random_uuid(),

    code text not null unique,
    name text not null,
    description text,

    is_system boolean not null default true,
    created_at timestamptz not null default now(),

    constraint roles_code_format
        check (code ~ '^[a-z][a-z0-9_]*$')
);


-- =========================================================
-- 3. USER ROLES
-- =========================================================

create table if not exists public.user_roles (
    user_id uuid not null
        references public.users(id) on delete cascade,

    role_id uuid not null
        references public.roles(id) on delete restrict,

    assigned_at timestamptz not null default now(),
    assigned_by uuid references public.users(id) on delete set null,

    primary key (user_id, role_id)
);


-- =========================================================
-- 4. ADDRESSES
-- =========================================================

create table if not exists public.addresses (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete cascade,

    label text,
    address_text text not null,

    apartment text,
    floor text,
    landmark text,
    delivery_note text,

    latitude numeric(9,6),
    longitude numeric(9,6),

    is_default boolean not null default false,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint addresses_latitude_range
        check (latitude is null or latitude between -90 and 90),

    constraint addresses_longitude_range
        check (longitude is null or longitude between -180 and 180),

    constraint addresses_text_length
        check (char_length(address_text) between 2 and 500)
);

create index if not exists addresses_user_id_idx
    on public.addresses (user_id);

create unique index if not exists addresses_one_default_per_user_idx
    on public.addresses (user_id)
    where is_default = true and is_active = true;


-- =========================================================
-- 5. UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;

create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();


drop trigger if exists addresses_set_updated_at on public.addresses;

create trigger addresses_set_updated_at
before update on public.addresses
for each row
execute function public.set_updated_at();


-- =========================================================
-- 6. AUTO-CREATE USER PROFILE AFTER AUTH SIGNUP
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.users (
        id,
        phone,
        full_name
    )
    values (
        new.id,
        new.phone,
        coalesce(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name'
        )
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- =========================================================
-- 7. SEED SYSTEM ROLES
-- =========================================================

insert into public.roles (
    code,
    name,
    description,
    is_system
)
values
    (
        'customer',
        'Customer',
        'WASSLHA customer role',
        true
    ),
    (
        'rider',
        'Rider',
        'WASSLHA rider role',
        true
    ),
    (
        'merchant',
        'Merchant',
        'WASSLHA merchant role',
        true
    ),
    (
        'admin',
        'Admin',
        'WASSLHA administrator role',
        true
    )
on conflict (code) do nothing;


-- =========================================================
-- 8. DEFAULT CUSTOMER ROLE
-- =========================================================

create or replace function public.assign_default_customer_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    customer_role_id uuid;
begin
    select id
    into customer_role_id
    from public.roles
    where code = 'customer'
    limit 1;

    if customer_role_id is not null then
        insert into public.user_roles (
            user_id,
            role_id
        )
        values (
            new.id,
            customer_role_id
        )
        on conflict (user_id, role_id) do nothing;
    end if;

    return new;
end;
$$;

drop trigger if exists assign_default_customer_role
    on public.users;

create trigger assign_default_customer_role
after insert on public.users
for each row
execute function public.assign_default_customer_role();


-- =========================================================
-- 9. ROLE CHECK HELPER
-- =========================================================

create or replace function public.has_role(
    requested_role text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.user_roles ur
        join public.roles r
            on r.id = ur.role_id
        where ur.user_id = auth.uid()
          and r.code = requested_role
    );
$$;


-- =========================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.addresses enable row level security;


-- =========================================================
-- 11. USERS RLS
-- =========================================================

drop policy if exists users_select_own
    on public.users;

create policy users_select_own
on public.users
for select
to authenticated
using (
    id = auth.uid()
    or public.has_role('admin')
);


drop policy if exists users_update_own
    on public.users;

create policy users_update_own
on public.users
for update
to authenticated
using (
    id = auth.uid()
)
with check (
    id = auth.uid()
);


-- =========================================================
-- 12. ROLES RLS
-- =========================================================

drop policy if exists roles_select_authenticated
    on public.roles;

create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (true);


-- =========================================================
-- 13. USER ROLES RLS
-- =========================================================

drop policy if exists user_roles_select_own
    on public.user_roles;

create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using (
    user_id = auth.uid()
    or public.has_role('admin')
);


-- No client INSERT / UPDATE / DELETE policy is intentionally
-- created for user_roles.
--
-- Role assignment will be controlled by the backend/admin
-- workflow using privileged server-side operations.


-- =========================================================
-- 14. ADDRESSES RLS
-- =========================================================

drop policy if exists addresses_select_own
    on public.addresses;

create policy addresses_select_own
on public.addresses
for select
to authenticated
using (
    user_id = auth.uid()
);


drop policy if exists addresses_insert_own
    on public.addresses;

create policy addresses_insert_own
on public.addresses
for insert
to authenticated
with check (
    user_id = auth.uid()
);


drop policy if exists addresses_update_own
    on public.addresses;

create policy addresses_update_own
on public.addresses
for update
to authenticated
using (
    user_id = auth.uid()
)
with check (
    user_id = auth.uid()
);


drop policy if exists addresses_delete_own
    on public.addresses;

create policy addresses_delete_own
on public.addresses
for delete
to authenticated
using (
    user_id = auth.uid()
);


-- =========================================================
-- 15. COMMENTS
-- =========================================================

comment on table public.users is
    'WASSLHA application user profiles linked to Supabase Auth users.';

comment on table public.roles is
    'System RBAC roles: customer, rider, merchant, admin.';

comment on table public.user_roles is
    'User-to-role assignments controlled by backend/admin workflows.';

comment on table public.addresses is
    'Customer saved delivery addresses with optional GPS coordinates.';


-- =========================================================
-- COMPLETE
-- =========================================================

commit;
