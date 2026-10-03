-- WASSLHA
-- Migration #69
-- Communication Foundation
-- Berrechid MVP
--
-- Covers:
-- - Conversations
-- - Messages
-- - Call Sessions
-- - Notifications
-- - Notification Preferences
--
-- Communication writes are backend controlled where appropriate.
-- Sensitive communication data is protected by RLS.
-- Notifications are traceable and status based.

begin;

-- =========================================================
-- 1. CONVERSATIONS
-- =========================================================

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),

    conversation_type text not null
        check (
            conversation_type in (
                'order',
                'support',
                'direct'
            )
        ),

    master_order_id uuid
        references public.master_orders(id) on delete restrict,

    created_by uuid
        references public.users(id) on delete set null,

    status text not null default 'active'
        check (
            status in (
                'active',
                'closed',
                'archived'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint conversations_order_type_valid
        check (
            conversation_type <> 'order'
            or master_order_id is not null
        )
);

create index if not exists conversations_order_idx
    on public.conversations (master_order_id);

create index if not exists conversations_created_by_idx
    on public.conversations (created_by);

create index if not exists conversations_status_idx
    on public.conversations (status);


-- =========================================================
-- 2. MESSAGES
-- =========================================================

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),

    conversation_id uuid not null
        references public.conversations(id) on delete restrict,

    sender_id uuid not null
        references public.users(id) on delete restrict,

    message_type text not null default 'text'
        check (
            message_type in (
                'text',
                'image',
                'file',
                'system'
            )
        ),

    body text,

    metadata jsonb not null default '{}'::jsonb,

    read_at timestamptz,

    created_at timestamptz not null default now(),

    constraint messages_content_required
        check (
            body is not null
            or metadata <> '{}'::jsonb
        )
);

create index if not exists messages_conversation_idx
    on public.messages (
        conversation_id,
        created_at asc
    );

create index if not exists messages_sender_idx
    on public.messages (sender_id, created_at desc);


-- =========================================================
-- 3. CALL SESSIONS
-- =========================================================

create table if not exists public.call_sessions (
    id uuid primary key default gen_random_uuid(),

    conversation_id uuid
        references public.conversations(id) on delete restrict,

    caller_id uuid not null
        references public.users(id) on delete restrict,

    callee_id uuid not null
        references public.users(id) on delete restrict,

    provider text,

    provider_call_id text,

    status text not null default 'requested'
        check (
            status in (
                'requested',
                'ringing',
                'active',
                'completed',
                'missed',
                'cancelled',
                'failed'
            )
        ),

    started_at timestamptz,
    ended_at timestamptz,

    created_at timestamptz not null default now(),

    constraint call_sessions_users_different
        check (caller_id <> callee_id),

    constraint call_sessions_dates_valid
        check (
            ended_at is null
            or started_at is null
            or ended_at >= started_at
        )
);

create index if not exists call_sessions_conversation_idx
    on public.call_sessions (conversation_id, created_at desc);

create index if not exists call_sessions_caller_idx
    on public.call_sessions (caller_id, created_at desc);

create index if not exists call_sessions_callee_idx
    on public.call_sessions (callee_id, created_at desc);

create unique index if not exists call_sessions_provider_call_unique_idx
    on public.call_sessions (provider, provider_call_id)
    where provider_call_id is not null;


-- =========================================================
-- 4. NOTIFICATIONS
-- =========================================================

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete restrict,

    notification_type text not null,

    title text not null,

    body text not null,

    data jsonb not null default '{}'::jsonb,

    channel text not null default 'in_app'
        check (
            channel in (
                'in_app',
                'push',
                'sms',
                'telegram'
            )
        ),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'sent',
                'failed',
                'read'
            )
        ),

    sent_at timestamptz,
    read_at timestamptz,

    created_at timestamptz not null default now(),

    constraint notifications_read_status_valid
        check (
            status <> 'read'
            or read_at is not null
        )
);

create index if not exists notifications_user_idx
    on public.notifications (
        user_id,
        created_at desc
    );

create index if not exists notifications_status_idx
    on public.notifications (
        status,
        created_at asc
    );

create index if not exists notifications_type_idx
    on public.notifications (
        notification_type,
        created_at desc
    );


-- =========================================================
-- 5. NOTIFICATION PREFERENCES
-- =========================================================

create table if not exists public.notification_preferences (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id) on delete restrict,

    push_enabled boolean not null default true,
    sms_enabled boolean not null default true,
    telegram_enabled boolean not null default true,

    order_updates boolean not null default true,
    promotions boolean not null default true,
    support_updates boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists notification_preferences_user_unique_idx
    on public.notification_preferences (user_id);


-- =========================================================
-- 6. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists conversations_set_updated_at
    on public.conversations;

create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();


drop trigger if exists notification_preferences_set_updated_at
    on public.notification_preferences;

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();


-- =========================================================
-- 7. ENABLE RLS
-- =========================================================

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.call_sessions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;


-- =========================================================
-- 8. CONVERSATIONS RLS
-- =========================================================

drop policy if exists conversations_select_participants_admin
    on public.conversations;

create policy conversations_select_participants_admin
on public.conversations
for select
to authenticated
using (
    public.has_role('admin')
    or created_by = auth.uid()
    or exists (
        select 1
        from public.master_orders mo
        where mo.id = conversations.master_order_id
          and mo.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.sub_orders so
        join public.merchants m
            on m.id = (
                select s.merchant_id
                from public.stores s
                where s.id = so.store_id
            )
        where so.master_order_id = conversations.master_order_id
          and m.user_id = auth.uid()
    )
    or exists (
        select 1
        from public.deliveries d
        join public.delivery_assignments da
            on da.delivery_id = d.id
        join public.riders r
            on r.id = da.rider_id
        where d.master_order_id = conversations.master_order_id
          and r.id = auth.uid()
    )
);


-- Conversation creation/update is backend controlled.


-- =========================================================
-- 9. MESSAGES RLS
-- =========================================================

drop policy if exists messages_select_conversation_participants_admin
    on public.messages;

create policy messages_select_conversation_participants_admin
on public.messages
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.conversations c
        where c.id = messages.conversation_id
          and (
              c.created_by = auth.uid()
              or exists (
                  select 1
                  from public.master_orders mo
                  where mo.id = c.master_order_id
                    and mo.customer_id = auth.uid()
              )
              or exists (
                  select 1
                  from public.sub_orders so
                  join public.merchants m
                      on m.id = so.merchant_id
                  where so.master_order_id = c.master_order_id
                    and m.user_id = auth.uid()
              )
              or exists (
                  select 1
                  from public.deliveries d
                  join public.delivery_assignments da
                      on da.delivery_id = d.id
                  join public.riders r
                      on r.id = da.rider_id
                  where d.master_order_id = c.master_order_id
                    and r.id = auth.uid()
              )
          )
    )
);


-- Message writes are backend controlled.


-- =========================================================
-- 10. CALL SESSIONS RLS
-- =========================================================

drop policy if exists call_sessions_select_participants_admin
    on public.call_sessions;

create policy call_sessions_select_participants_admin
on public.call_sessions
for select
to authenticated
using (
    public.has_role('admin')
    or caller_id = auth.uid()
    or callee_id = auth.uid()
);


-- Call lifecycle writes are backend controlled.


-- =========================================================
-- 11. NOTIFICATIONS RLS
-- =========================================================

drop policy if exists notifications_select_own_admin
    on public.notifications;

create policy notifications_select_own_admin
on public.notifications
for select
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
);


-- Notification creation and delivery are backend controlled.


-- =========================================================
-- 12. NOTIFICATION PREFERENCES RLS
-- =========================================================

drop policy if exists notification_preferences_select_own_admin
    on public.notification_preferences;

create policy notification_preferences_select_own_admin
on public.notification_preferences
for select
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
);

drop policy if exists notification_preferences_update_own_admin
    on public.notification_preferences;

create policy notification_preferences_update_own_admin
on public.notification_preferences
for update
to authenticated
using (
    public.has_role('admin')
    or user_id = auth.uid()
)
with check (
    public.has_role('admin')
    or user_id = auth.uid()
);


-- =========================================================
-- 13. COMMENTS
-- =========================================================

comment on table public.conversations is
    'WASSLHA communication conversations linked to orders, support, or direct communication.';

comment on table public.messages is
    'Messages exchanged inside WASSLHA conversations.';

comment on table public.call_sessions is
    'Traceable voice call sessions between WASSLHA users.';

comment on table public.notifications is
    'User notifications across in-app and external delivery channels.';

comment on table public.notification_preferences is
    'User-controlled notification channel and category preferences.';


-- =========================================================
-- 14. FINALIZE MIGRATION
-- =========================================================

commit;
