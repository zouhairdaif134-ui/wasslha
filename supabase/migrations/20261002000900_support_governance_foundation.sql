-- WASSLHA
-- Migration #70
-- Support & Governance Foundation
-- Berrechid MVP
--
-- Covers:
-- - Support Tickets
-- - Complaints
-- - Reviews
-- - Review Replies
-- - Audit Logs
--
-- Governance records are traceable.
-- Audit logs are append-only.
-- Sensitive writes are backend controlled.

begin;

-- =========================================================
-- 1. SUPPORT TICKETS
-- =========================================================

create table if not exists public.support_tickets (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete restrict,

    master_order_id uuid
        references public.master_orders(id) on delete restrict,

    subject text not null,

    description text not null,

    category text not null
        check (
            category in (
                'order',
                'delivery',
                'payment',
                'merchant',
                'rider',
                'account',
                'technical',
                'other'
            )
        ),

    priority text not null default 'normal'
        check (
            priority in (
                'low',
                'normal',
                'high',
                'urgent'
            )
        ),

    status text not null default 'open'
        check (
            status in (
                'open',
                'in_progress',
                'waiting_user',
                'resolved',
                'closed'
            )
        ),

    assigned_to uuid
        references public.users(id) on delete set null,

    resolved_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx
    on public.support_tickets (
        user_id,
        created_at desc
    );

create index if not exists support_tickets_order_idx
    on public.support_tickets (master_order_id);

create index if not exists support_tickets_status_idx
    on public.support_tickets (
        status,
        priority,
        created_at asc
    );

create index if not exists support_tickets_assigned_idx
    on public.support_tickets (
        assigned_to,
        status
    );


-- =========================================================
-- 2. COMPLAINTS
-- =========================================================

create table if not exists public.complaints (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete restrict,

    master_order_id uuid
        references public.master_orders(id) on delete restrict,

    complaint_type text not null
        check (
            complaint_type in (
                'missing_item',
                'wrong_item',
                'damaged_item',
                'late_delivery',
                'rider_issue',
                'merchant_issue',
                'payment_issue',
                'quality_issue',
                'other'
            )
        ),

    description text not null,

    status text not null default 'open'
        check (
            status in (
                'open',
                'investigating',
                'resolved',
                'rejected'
            )
        ),

    resolution text,

    resolved_by uuid
        references public.users(id) on delete set null,

    resolved_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists complaints_user_idx
    on public.complaints (
        user_id,
        created_at desc
    );

create index if not exists complaints_order_idx
    on public.complaints (master_order_id);

create index if not exists complaints_status_idx
    on public.complaints (
        status,
        created_at asc
    );


-- =========================================================
-- 3. REVIEWS
-- =========================================================

create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete restrict,

    master_order_id uuid not null
        references public.master_orders(id) on delete restrict,

    merchant_id uuid
        references public.merchants(id) on delete restrict,

    rider_id uuid
        references public.riders(id) on delete restrict,

    rating smallint not null
        check (
            rating between 1 and 5
        ),

    title text,

    body text,

    is_published boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists reviews_order_idx
    on public.reviews (master_order_id);

create index if not exists reviews_merchant_idx
    on public.reviews (
        merchant_id,
        created_at desc
    );

create index if not exists reviews_rider_idx
    on public.reviews (
        rider_id,
        created_at desc
    );

create index if not exists reviews_user_idx
    on public.reviews (
        user_id,
        created_at desc
    );


-- =========================================================
-- 4. REVIEW REPLIES
-- =========================================================

create table if not exists public.review_replies (
    id uuid primary key default gen_random_uuid(),

    review_id uuid not null
        references public.reviews(id) on delete restrict,

    user_id uuid not null
        references public.users(id) on delete restrict,

    body text not null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists review_replies_review_idx
    on public.review_replies (
        review_id,
        created_at asc
    );


-- =========================================================
-- 5. AUDIT LOGS
-- =========================================================

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),

    actor_user_id uuid
        references public.users(id) on delete set null,

    action text not null,

    entity_type text not null,

    entity_id uuid,

    before_data jsonb,

    after_data jsonb,

    metadata jsonb not null default '{}'::jsonb,

    ip_address inet,

    user_agent text,

    created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx
    on public.audit_logs (
        actor_user_id,
        created_at desc
    );

create index if not exists audit_logs_entity_idx
    on public.audit_logs (
        entity_type,
        entity_id,
        created_at desc
    );

create index if not exists audit_logs_action_idx
    on public.audit_logs (
        action,
        created_at desc
    );


-- =========================================================
-- 6. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists support_tickets_set_updated_at
    on public.support_tickets;

create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row
execute function public.set_updated_at();


drop trigger if exists complaints_set_updated_at
    on public.complaints;

create trigger complaints_set_updated_at
before update on public.complaints
for each row
execute function public.set_updated_at();


drop trigger if exists reviews_set_updated_at
    on public.reviews;

create trigger reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();


drop trigger if exists review_replies_set_updated_at
    on public.review_replies;

create trigger review_replies_set_updated_at
before update on public.review_replies
for each row
execute function public.set_updated_at();


-- =========================================================
-- 7. ENABLE RLS
-- =========================================================

alter table public.support_tickets enable row level security;
alter table public.complaints enable row level security;
alter table public.reviews enable row level security;
alter table public.review_replies enable row level security;
alter table public.audit_logs enable row level security;


-- =========================================================
-- 8. SUPPORT TICKETS RLS
-- =========================================================

drop policy if exists support_tickets_select_own_admin
    on public.support_tickets;

create policy support_tickets_select_own_admin
on public.support_tickets
for select
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
    or assigned_to = auth.uid()
);


-- Support ticket creation and status changes
-- are backend controlled.


-- =========================================================
-- 9. COMPLAINTS RLS
-- =========================================================

drop policy if exists complaints_select_own_admin
    on public.complaints;

create policy complaints_select_own_admin
on public.complaints
for select
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
    or resolved_by = auth.uid()
);


-- Complaint processing is backend controlled.


-- =========================================================
-- 10. REVIEWS RLS
-- =========================================================

drop policy if exists reviews_select_published_authenticated
    on public.reviews;

create policy reviews_select_published_authenticated
on public.reviews
for select
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
    or is_published = true
);


-- Review creation/moderation is backend controlled.


-- =========================================================
-- 11. REVIEW REPLIES RLS
-- =========================================================

drop policy if exists review_replies_select_published_review
    on public.review_replies;

create policy review_replies_select_published_review
on public.review_replies
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.reviews r
        where r.id = review_replies.review_id
          and (
              r.is_published = true
              or r.user_id = auth.uid()
          )
    )
);


-- Review reply writes are backend controlled.


-- =========================================================
-- 12. AUDIT LOGS RLS
-- =========================================================

drop policy if exists audit_logs_select_admin
    on public.audit_logs;

create policy audit_logs_select_admin
on public.audit_logs
for select
to authenticated
using (
    public.has_role('admin')
);


-- Audit logs are append-only.
-- Inserts are backend controlled.
-- No UPDATE policy.
-- No DELETE policy.


-- =========================================================
-- 13. COMMENTS
-- =========================================================

comment on table public.support_tickets is
    'Customer and platform support tickets for WASSLHA.';

comment on table public.complaints is
    'Order and service complaints with traceable resolution state.';

comment on table public.reviews is
    'Customer ratings and reviews for completed WASSLHA orders.';

comment on table public.review_replies is
    'Replies to customer reviews by authorized users.';

comment on table public.audit_logs is
    'Append-only governance and security audit trail.';


-- =========================================================
-- 14. FINALIZE MIGRATION
-- =========================================================

commit;
