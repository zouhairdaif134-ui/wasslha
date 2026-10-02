-- WASSLHA
-- Migration #65
-- Delivery Foundation
-- Berrechid MVP

begin;

-- =========================================================
-- 1. DELIVERIES
-- =========================================================

create table if not exists public.deliveries (
    id uuid primary key default gen_random_uuid(),

    master_order_id uuid not null
        references public.master_orders(id) on delete restrict,

    pickup_address_text text,
    pickup_latitude numeric(9,6),
    pickup_longitude numeric(9,6),

    delivery_address_text text not null,
    delivery_latitude numeric(9,6),
    delivery_longitude numeric(9,6),

    distance_meters integer,
    eta_seconds integer,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'assigned',
                'accepted',
                'at_pickup',
                'picked_up',
                'in_transit',
                'delivered',
                'failed',
                'cancelled'
            )
        ),

    customer_note text,

    started_at timestamptz,
    picked_up_at timestamptz,
    delivered_at timestamptz,
    cancelled_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint deliveries_pickup_latitude_range
        check (
            pickup_latitude is null
            or pickup_latitude between -90 and 90
        ),

    constraint deliveries_pickup_longitude_range
        check (
            pickup_longitude is null
            or pickup_longitude between -180 and 180
        ),

    constraint deliveries_delivery_latitude_range
        check (
            delivery_latitude between -90 and 90
        ),

    constraint deliveries_delivery_longitude_range
        check (
            delivery_longitude between -180 and 180
        ),

    constraint deliveries_distance_nonnegative
        check (
            distance_meters is null
            or distance_meters >= 0
        ),

    constraint deliveries_eta_nonnegative
        check (
            eta_seconds is null
            or eta_seconds >= 0
        )
);

create unique index if not exists deliveries_master_order_unique_idx
    on public.deliveries (master_order_id);

create index if not exists deliveries_status_idx
    on public.deliveries (status);


-- =========================================================
-- 2. DELIVERY ASSIGNMENTS
-- =========================================================

create table if not exists public.delivery_assignments (
    id uuid primary key default gen_random_uuid(),

    delivery_id uuid not null
        references public.deliveries(id) on delete restrict,

    rider_id uuid not null
        references public.users(id) on delete restrict,

    assigned_by uuid
        references public.users(id) on delete set null,

    status text not null default 'offered'
        check (
            status in (
                'offered',
                'accepted',
                'rejected',
                'cancelled',
                'completed'
            )
        ),

    offered_at timestamptz not null default now(),
    responded_at timestamptz,
    completed_at timestamptz,

    rejection_reason text,

    created_at timestamptz not null default now()
);

create index if not exists delivery_assignments_delivery_id_idx
    on public.delivery_assignments (delivery_id);

create index if not exists delivery_assignments_rider_id_idx
    on public.delivery_assignments (rider_id);

create index if not exists delivery_assignments_status_idx
    on public.delivery_assignments (status);


-- =========================================================
-- 3. RIDER LOCATIONS
-- =========================================================

create table if not exists public.rider_locations (
    id uuid primary key default gen_random_uuid(),

    rider_id uuid not null
        references public.users(id) on delete restrict,

    delivery_id uuid
        references public.deliveries(id) on delete restrict,

    latitude numeric(9,6) not null,
    longitude numeric(9,6) not null,

    accuracy_meters numeric(8,2),
    speed_mps numeric(8,2),
    heading numeric(6,2),

    recorded_at timestamptz not null default now(),

    constraint rider_locations_latitude_range
        check (latitude between -90 and 90),

    constraint rider_locations_longitude_range
        check (longitude between -180 and 180),

    constraint rider_locations_accuracy_nonnegative
        check (
            accuracy_meters is null
            or accuracy_meters >= 0
        ),

    constraint rider_locations_speed_nonnegative
        check (
            speed_mps is null
            or speed_mps >= 0
        ),

    constraint rider_locations_heading_range
        check (
            heading is null
            or heading between 0 and 360
        )
);

create index if not exists rider_locations_rider_recorded_idx
    on public.rider_locations (rider_id, recorded_at desc);

create index if not exists rider_locations_delivery_recorded_idx
    on public.rider_locations (delivery_id, recorded_at desc);


-- =========================================================
-- 4. DELIVERY EVENTS
-- =========================================================

create table if not exists public.delivery_events (
    id uuid primary key default gen_random_uuid(),

    delivery_id uuid not null
        references public.deliveries(id) on delete restrict,

    rider_id uuid
        references public.users(id) on delete set null,

    event_type text not null
        check (
            event_type in (
                'assignment_offered',
                'assignment_accepted',
                'assignment_rejected',
                'arrived_pickup',
                'pickup_confirmed',
                'departed_pickup',
                'arrived_customer',
                'delivery_confirmed',
                'delivery_failed',
                'proof_uploaded'
            )
        ),

    latitude numeric(9,6),
    longitude numeric(9,6),

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint delivery_events_latitude_range
        check (
            latitude is null
            or latitude between -90 and 90
        ),

    constraint delivery_events_longitude_range
        check (
            longitude is null
            or longitude between -180 and 180
        )
);

create index if not exists delivery_events_delivery_created_idx
    on public.delivery_events (delivery_id, created_at);


-- =========================================================
-- 5. WAITING SESSIONS
-- =========================================================

create table if not exists public.waiting_sessions (
    id uuid primary key default gen_random_uuid(),

    rider_id uuid not null
        references public.users(id) on delete restrict,

    started_at timestamptz not null default now(),
    ended_at timestamptz,

    status text not null default 'active'
        check (
            status in (
                'active',
                'ended',
                'cancelled'
            )
        ),

    latitude numeric(9,6),
    longitude numeric(9,6),

    created_at timestamptz not null default now(),

    constraint waiting_sessions_latitude_range
        check (
            latitude is null
            or latitude between -90 and 90
        ),

    constraint waiting_sessions_longitude_range
        check (
            longitude is null
            or longitude between -180 and 180
        ),

    constraint waiting_sessions_time_order
        check (
            ended_at is null
            or ended_at >= started_at
        )
);

create index if not exists waiting_sessions_rider_idx
    on public.waiting_sessions (rider_id);

create index if not exists waiting_sessions_status_idx
    on public.waiting_sessions (status);


-- =========================================================
-- 6. UPDATED_AT TRIGGER
-- =========================================================

drop trigger if exists deliveries_set_updated_at
    on public.deliveries;

create trigger deliveries_set_updated_at
before update on public.deliveries
for each row
execute function public.set_updated_at();


-- =========================================================
-- 7. ENABLE RLS
-- =========================================================

alter table public.deliveries enable row level security;
alter table public.delivery_assignments enable row level security;
alter table public.rider_locations enable row level security;
alter table public.delivery_events enable row level security;
alter table public.waiting_sessions enable row level security;


-- =========================================================
-- 8. DELIVERY RLS
-- =========================================================

drop policy if exists deliveries_select_customer_rider_admin
    on public.deliveries;

create policy deliveries_select_customer_rider_admin
on public.deliveries
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.master_orders mo
        where mo.id = deliveries.master_order_id
          and mo.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.delivery_assignments da
        where da.delivery_id = deliveries.id
          and da.rider_id = auth.uid()
          and da.status in ('offered', 'accepted')
    )
);


-- =========================================================
-- 9. DELIVERY ASSIGNMENTS RLS
-- =========================================================

drop policy if exists delivery_assignments_select_authorized
    on public.delivery_assignments;

create policy delivery_assignments_select_authorized
on public.delivery_assignments
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
    or exists (
        select 1
        from public.deliveries d
        join public.master_orders mo
            on mo.id = d.master_order_id
        where d.id = delivery_assignments.delivery_id
          and mo.customer_id = auth.uid()
    )
);


-- =========================================================
-- 10. RIDER LOCATIONS RLS
-- =========================================================

drop policy if exists rider_locations_select_authorized
    on public.rider_locations;

create policy rider_locations_select_authorized
on public.rider_locations
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
    or exists (
        select 1
        from public.deliveries d
        join public.master_orders mo
            on mo.id = d.master_order_id
        where d.id = rider_locations.delivery_id
          and mo.customer_id = auth.uid()
          and d.status in (
              'assigned',
              'accepted',
              'at_pickup',
              'picked_up',
              'in_transit'
          )
    )
);


-- Rider location writes are backend-controlled.
-- No direct client INSERT/UPDATE/DELETE policy.


-- =========================================================
-- 11. DELIVERY EVENTS RLS
-- =========================================================

drop policy if exists delivery_events_select_authorized
    on public.delivery_events;

create policy delivery_events_select_authorized
on public.delivery_events
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
    or exists (
        select 1
        from public.deliveries d
        join public.master_orders mo
            on mo.id = d.master_order_id
        where d.id = delivery_events.delivery_id
          and mo.customer_id = auth.uid()
    )
);


-- =========================================================
-- 12. WAITING SESSIONS RLS
-- =========================================================

drop policy if exists waiting_sessions_select_own_admin
    on public.waiting_sessions;

create policy waiting_sessions_select_own_admin
on public.waiting_sessions
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
);


drop policy if exists waiting_sessions_insert_own
    on public.waiting_sessions;

create policy waiting_sessions_insert_own
on public.waiting_sessions
for insert
to authenticated
with check (
    rider_id = auth.uid()
    and public.has_role('rider')
);


drop policy if exists waiting_sessions_update_own
    on public.waiting_sessions;

create policy waiting_sessions_update_own
on public.waiting_sessions
for update
to authenticated
using (
    rider_id = auth.uid()
    and public.has_role('rider')
)
with check (
    rider_id = auth.uid()
    and public.has_role('rider')
);


-- =========================================================
-- 13. COMMENTS
-- =========================================================

comment on table public.deliveries is
    'Delivery lifecycle and GPS destination data for customer orders.';

comment on table public.delivery_assignments is
    'Rider assignment offers and outcomes.';

comment on table public.rider_locations is
    'Time-limited rider GPS locations during active delivery service.';

comment on table public.delivery_events is
    'Append-only operational events for delivery tracking.';

comment on table public.waiting_sessions is
    'Rider waiting/availability sessions used by dispatch and slot logic.';


commit;
