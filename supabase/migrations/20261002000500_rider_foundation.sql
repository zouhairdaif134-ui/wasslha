-- WASSLHA
-- Migration #66
-- Rider Foundation
-- Berrechid MVP

begin;

-- =========================================================
-- 1. RIDERS
-- =========================================================

create table if not exists public.riders (
    id uuid primary key
        references public.users(id) on delete restrict,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'approved',
                'suspended',
                'inactive',
                'rejected'
            )
        ),

    vehicle_type text
        check (
            vehicle_type is null
            or vehicle_type in (
                'bicycle',
                'motorcycle',
                'car',
                'van'
            )
        ),

    vehicle_plate text,

    national_id_last4 text,

    is_online boolean not null default false,

    approved_at timestamptz,
    approved_by uuid
        references public.users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists riders_status_idx
    on public.riders (status);

create index if not exists riders_online_idx
    on public.riders (is_online);


-- =========================================================
-- 2. VEHICLES
-- =========================================================

create table if not exists public.vehicles (
    id uuid primary key default gen_random_uuid(),

    rider_id uuid not null
        references public.riders(id) on delete restrict,

    vehicle_type text not null
        check (
            vehicle_type in (
                'bicycle',
                'motorcycle',
                'car',
                'van'
            )
        ),

    make text,
    model text,
    color text,
    plate_number text,

    is_primary boolean not null default false,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists vehicles_rider_id_idx
    on public.vehicles (rider_id);

create unique index if not exists vehicles_one_primary_idx
    on public.vehicles (rider_id)
    where is_primary = true and is_active = true;


-- =========================================================
-- 3. RIDER SLOTS
-- =========================================================

create table if not exists public.rider_slots (
    id uuid primary key default gen_random_uuid(),

    slot_date date not null,

    start_time time not null,
    end_time time not null,

    capacity integer not null,

    status text not null default 'open'
        check (
            status in (
                'open',
                'closed',
                'cancelled'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint rider_slots_capacity_positive
        check (capacity > 0),

    constraint rider_slots_time_order
        check (end_time > start_time),

    unique (slot_date, start_time, end_time)
);

create index if not exists rider_slots_date_idx
    on public.rider_slots (slot_date);

create index if not exists rider_slots_status_idx
    on public.rider_slots (status);


-- =========================================================
-- 4. SLOT WAITLIST
-- =========================================================

create table if not exists public.slot_waitlist (
    id uuid primary key default gen_random_uuid(),

    slot_id uuid not null
        references public.rider_slots(id) on delete restrict,

    rider_id uuid not null
        references public.riders(id) on delete restrict,

    position integer,

    status text not null default 'waiting'
        check (
            status in (
                'waiting',
                'accepted',
                'expired',
                'cancelled'
            )
        ),

    joined_at timestamptz not null default now(),
    resolved_at timestamptz,

    constraint slot_waitlist_position_positive
        check (
            position is null
            or position > 0
        ),

    unique (slot_id, rider_id)
);

create index if not exists slot_waitlist_slot_idx
    on public.slot_waitlist (slot_id, position);

create index if not exists slot_waitlist_rider_idx
    on public.slot_waitlist (rider_id);


-- =========================================================
-- 5. SLOT ATTENDANCE
-- =========================================================

create table if not exists public.slot_attendance (
    id uuid primary key default gen_random_uuid(),

    slot_id uuid not null
        references public.rider_slots(id) on delete restrict,

    rider_id uuid not null
        references public.riders(id) on delete restrict,

    status text not null default 'scheduled'
        check (
            status in (
                'scheduled',
                'checked_in',
                'late',
                'absent',
                'completed',
                'cancelled'
            )
        ),

    checked_in_at timestamptz,
    checked_out_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (slot_id, rider_id),

    constraint slot_attendance_time_order
        check (
            checked_out_at is null
            or checked_in_at is null
            or checked_out_at >= checked_in_at
        )
);

create index if not exists slot_attendance_slot_idx
    on public.slot_attendance (slot_id);

create index if not exists slot_attendance_rider_idx
    on public.slot_attendance (rider_id);


-- =========================================================
-- 6. RIDER VIOLATIONS
-- =========================================================

create table if not exists public.rider_violations (
    id uuid primary key default gen_random_uuid(),

    rider_id uuid not null
        references public.riders(id) on delete restrict,

    violation_type text not null,

    severity text not null default 'medium'
        check (
            severity in (
                'low',
                'medium',
                'high',
                'critical'
            )
        ),

    description text,

    status text not null default 'open'
        check (
            status in (
                'open',
                'reviewed',
                'resolved',
                'dismissed'
            )
        ),

    reported_by uuid
        references public.users(id) on delete set null,

    resolved_by uuid
        references public.users(id) on delete set null,

    resolved_at timestamptz,

    created_at timestamptz not null default now()
);

create index if not exists rider_violations_rider_idx
    on public.rider_violations (rider_id);

create index if not exists rider_violations_status_idx
    on public.rider_violations (status);


-- =========================================================
-- 7. RIDER PERFORMANCE
-- =========================================================

create table if not exists public.rider_performance (
    id uuid primary key default gen_random_uuid(),

    rider_id uuid not null
        references public.riders(id) on delete restrict,

    period_start date not null,
    period_end date not null,

    completed_deliveries integer not null default 0,
    cancelled_deliveries integer not null default 0,
    late_deliveries integer not null default 0,

    acceptance_rate numeric(5,2),
    completion_rate numeric(5,2),
    average_delivery_minutes numeric(8,2),

    customer_rating numeric(3,2),

    calculated_at timestamptz not null default now(),

    constraint rider_performance_period_order
        check (period_end >= period_start),

    constraint rider_performance_completed_nonnegative
        check (completed_deliveries >= 0),

    constraint rider_performance_cancelled_nonnegative
        check (cancelled_deliveries >= 0),

    constraint rider_performance_late_nonnegative
        check (late_deliveries >= 0),

    constraint rider_performance_acceptance_range
        check (
            acceptance_rate is null
            or acceptance_rate between 0 and 100
        ),

    constraint rider_performance_completion_range
        check (
            completion_rate is null
            or completion_rate between 0 and 100
        ),

    constraint rider_performance_rating_range
        check (
            customer_rating is null
            or customer_rating between 0 and 5
        ),

    unique (rider_id, period_start, period_end)
);

create index if not exists rider_performance_rider_idx
    on public.rider_performance (rider_id, period_start desc);


-- =========================================================
-- 8. RIDER BONUSES
-- =========================================================

create table if not exists public.rider_bonuses (
    id uuid primary key default gen_random_uuid(),

    rider_id uuid not null
        references public.riders(id) on delete restrict,

    title text not null,
    description text,

    amount_minor integer not null,

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

    period_start date,
    period_end date,

    approved_by uuid
        references public.users(id) on delete set null,

    approved_at timestamptz,
    paid_at timestamptz,

    created_at timestamptz not null default now(),

    constraint rider_bonuses_amount_nonnegative
        check (amount_minor >= 0),

    constraint rider_bonuses_currency_mad
        check (currency = 'MAD'),

    constraint rider_bonuses_period_order
        check (
            period_end is null
            or period_start is null
            or period_end >= period_start
        )
);

create index if not exists rider_bonuses_rider_idx
    on public.rider_bonuses (rider_id);

create index if not exists rider_bonuses_status_idx
    on public.rider_bonuses (status);


-- =========================================================
-- 9. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists riders_set_updated_at
    on public.riders;

create trigger riders_set_updated_at
before update on public.riders
for each row
execute function public.set_updated_at();


drop trigger if exists vehicles_set_updated_at
    on public.vehicles;

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row
execute function public.set_updated_at();


drop trigger if exists rider_slots_set_updated_at
    on public.rider_slots;

create trigger rider_slots_set_updated_at
before update on public.rider_slots
for each row
execute function public.set_updated_at();


drop trigger if exists slot_attendance_set_updated_at
    on public.slot_attendance;

create trigger slot_attendance_set_updated_at
before update on public.slot_attendance
for each row
execute function public.set_updated_at();


-- =========================================================
-- 10. ENABLE RLS
-- =========================================================

alter table public.riders enable row level security;
alter table public.vehicles enable row level security;
alter table public.rider_slots enable row level security;
alter table public.slot_waitlist enable row level security;
alter table public.slot_attendance enable row level security;
alter table public.rider_violations enable row level security;
alter table public.rider_performance enable row level security;
alter table public.rider_bonuses enable row level security;


-- =========================================================
-- 11. RIDERS RLS
-- =========================================================

drop policy if exists riders_select_own_admin
    on public.riders;

create policy riders_select_own_admin
on public.riders
for select
to authenticated
using (
    id = auth.uid()
    or public.has_role('admin')
);


drop policy if exists riders_insert_own
    on public.riders;

create policy riders_insert_own
on public.riders
for insert
to authenticated
with check (
    id = auth.uid()
);


drop policy if exists riders_update_own_admin
    on public.riders;

create policy riders_update_own_admin
on public.riders
for update
to authenticated
using (
    id = auth.uid()
    or public.has_role('admin')
)
with check (
    id = auth.uid()
    or public.has_role('admin')
);


-- =========================================================
-- 12. VEHICLES RLS
-- =========================================================

drop policy if exists vehicles_select_own_admin
    on public.vehicles;

create policy vehicles_select_own_admin
on public.vehicles
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
);


drop policy if exists vehicles_insert_own
    on public.vehicles;

create policy vehicles_insert_own
on public.vehicles
for insert
to authenticated
with check (
    rider_id = auth.uid()
    and public.has_role('rider')
);


drop policy if exists vehicles_update_own_admin
    on public.vehicles;

create policy vehicles_update_own_admin
on public.vehicles
for update
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
)
with check (
    public.has_role('admin')
    or rider_id = auth.uid()
);


-- =========================================================
-- 13. RIDER SLOTS RLS
-- =========================================================

drop policy if exists rider_slots_select_authenticated
    on public.rider_slots;

create policy rider_slots_select_authenticated
on public.rider_slots
for select
to authenticated
using (
    status <> 'cancelled'
);


drop policy if exists rider_slots_admin_manage
    on public.rider_slots;

create policy rider_slots_admin_manage
on public.rider_slots
for all
to authenticated
using (
    public.has_role('admin')
)
with check (
    public.has_role('admin')
);


-- =========================================================
-- 14. SLOT WAITLIST RLS
-- =========================================================

drop policy if exists slot_waitlist_select_own_admin
    on public.slot_waitlist;

create policy slot_waitlist_select_own_admin
on public.slot_waitlist
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.riders r
        where r.id = slot_waitlist.rider_id
          and r.id = auth.uid()
    )
);


drop policy if exists slot_waitlist_insert_own
    on public.slot_waitlist;

create policy slot_waitlist_insert_own
on public.slot_waitlist
for insert
to authenticated
with check (
    rider_id = auth.uid()
    and public.has_role('rider')
);


-- =========================================================
-- 15. SLOT ATTENDANCE RLS
-- =========================================================

drop policy if exists slot_attendance_select_own_admin
    on public.slot_attendance;

create policy slot_attendance_select_own_admin
on public.slot_attendance
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
);


-- Attendance state changes are backend/admin controlled.


-- =========================================================
-- 16. RIDER VIOLATIONS RLS
-- =========================================================

drop policy if exists rider_violations_select_own_admin
    on public.rider_violations;

create policy rider_violations_select_own_admin
on public.rider_violations
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
);


-- =========================================================
-- 17. RIDER PERFORMANCE RLS
-- =========================================================

drop policy if exists rider_performance_select_own_admin
    on public.rider_performance;

create policy rider_performance_select_own_admin
on public.rider_performance
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
);


-- =========================================================
-- 18. RIDER BONUSES RLS
-- =========================================================

drop policy if exists rider_bonuses_select_own_admin
    on public.rider_bonuses;

create policy rider_bonuses_select_own_admin
on public.rider_bonuses
for select
to authenticated
using (
    public.has_role('admin')
    or rider_id = auth.uid()
);


-- Bonus creation and payment are backend/admin controlled.


-- =========================================================
-- 19. COMMENTS
-- =========================================================

comment on table public.riders is
    'Rider operational profile and approval state.';

comment on table public.vehicles is
    'Rider vehicles used for WASSLHA deliveries.';

comment on table public.rider_slots is
    'Admin-defined rider service slots.';

comment on table public.slot_waitlist is
    'Rider waiting list for full service slots.';

comment on table public.slot_attendance is
    'Rider attendance against scheduled slots.';

comment on table public.rider_violations is
    'Rider operational violations and their resolution state.';

comment on table public.rider_performance is
    'Calculated rider performance metrics by period.';

comment on table public.rider_bonuses is
    'Rider incentive and bonus records in MAD minor units.';


commit;
