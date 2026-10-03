-- WASSLHA
-- Migration #72
-- Governance Completion
-- Berrechid MVP
--
-- Covers:
-- - Complaint Evidence
-- - Admin Settings
-- - Setting History
-- - Risk Flags
-- - App Versions
--
-- Sensitive governance data is protected by RLS.
-- Audit and setting history are append-only.
-- Administrative writes are backend controlled.

begin;

-- =========================================================
-- 1. COMPLAINT EVIDENCE
-- =========================================================

create table if not exists public.complaint_evidence (
    id uuid primary key default gen_random_uuid(),

    complaint_id uuid not null
        references public.complaints(id) on delete restrict,

    uploaded_by uuid not null
        references public.users(id) on delete restrict,

    evidence_type text not null
        check (
            evidence_type in (
                'image',
                'video',
                'document',
                'receipt',
                'other'
            )
        ),

    storage_path text not null,

    file_name text,

    mime_type text,

    file_size_bytes bigint,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint complaint_evidence_file_size_valid
        check (
            file_size_bytes is null
            or file_size_bytes >= 0
        )
);

create index if not exists complaint_evidence_complaint_idx
    on public.complaint_evidence (
        complaint_id,
        created_at asc
    );

create index if not exists complaint_evidence_uploader_idx
    on public.complaint_evidence (
        uploaded_by,
        created_at desc
    );


-- =========================================================
-- 2. ADMIN SETTINGS
-- =========================================================

create table if not exists public.admin_settings (
    id uuid primary key default gen_random_uuid(),

    setting_key text not null,

    setting_value jsonb not null,

    description text,

    is_sensitive boolean not null default false,

    updated_by uuid
        references public.users(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists admin_settings_key_unique_idx
    on public.admin_settings (setting_key);


-- =========================================================
-- 3. SETTING HISTORY
-- =========================================================

create table if not exists public.setting_history (
    id uuid primary key default gen_random_uuid(),

    setting_id uuid not null
        references public.admin_settings(id) on delete restrict,

    setting_key text not null,

    before_value jsonb,

    after_value jsonb not null,

    changed_by uuid
        references public.users(id) on delete set null,

    reason text,

    created_at timestamptz not null default now()
);

create index if not exists setting_history_setting_idx
    on public.setting_history (
        setting_id,
        created_at desc
    );

create index if not exists setting_history_key_idx
    on public.setting_history (
        setting_key,
        created_at desc
    );


-- =========================================================
-- 4. RISK FLAGS
-- =========================================================

create table if not exists public.risk_flags (
    id uuid primary key default gen_random_uuid(),

    user_id uuid
        references public.users(id) on delete restrict,

    master_order_id uuid
        references public.master_orders(id) on delete restrict,

    entity_type text not null,

    entity_id uuid,

    risk_type text not null,

    severity text not null default 'medium'
        check (
            severity in (
                'low',
                'medium',
                'high',
                'critical'
            )
        ),

    status text not null default 'open'
        check (
            status in (
                'open',
                'reviewing',
                'resolved',
                'dismissed'
            )
        ),

    score numeric(8,2),

    reason text,

    metadata jsonb not null default '{}'::jsonb,

    created_by uuid
        references public.users(id) on delete set null,

    resolved_by uuid
        references public.users(id) on delete set null,

    resolved_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint risk_flags_score_valid
        check (
            score is null
            or score >= 0
        )
);

create index if not exists risk_flags_user_idx
    on public.risk_flags (
        user_id,
        created_at desc
    );

create index if not exists risk_flags_order_idx
    on public.risk_flags (
        master_order_id,
        created_at desc
    );

create index if not exists risk_flags_status_idx
    on public.risk_flags (
        status,
        severity,
        created_at asc
    );

create index if not exists risk_flags_entity_idx
    on public.risk_flags (
        entity_type,
        entity_id
    );


-- =========================================================
-- 5. APP VERSIONS
-- =========================================================

create table if not exists public.app_versions (
    id uuid primary key default gen_random_uuid(),

    platform text not null
        check (
            platform in (
                'android',
                'ios',
                'web'
            )
        ),

    app_name text not null,

    version text not null,

    minimum_supported_version text,

    latest_version boolean not null default false,

    force_update boolean not null default false,

    release_notes text,

    is_active boolean not null default true,

    released_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists app_versions_platform_idx
    on public.app_versions (
        platform,
        app_name,
        is_active,
        created_at desc
    );

create unique index if not exists app_versions_unique_idx
    on public.app_versions (
        platform,
        app_name,
        version
    );


-- =========================================================
-- 6. UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists admin_settings_set_updated_at
    on public.admin_settings;

create trigger admin_settings_set_updated_at
before update on public.admin_settings
for each row
execute function public.set_updated_at();


drop trigger if exists risk_flags_set_updated_at
    on public.risk_flags;

create trigger risk_flags_set_updated_at
before update on public.risk_flags
for each row
execute function public.set_updated_at();


drop trigger if exists app_versions_set_updated_at
    on public.app_versions;

create trigger app_versions_set_updated_at
before update on public.app_versions
for each row
execute function public.set_updated_at();


-- =========================================================
-- 7. ENABLE RLS
-- =========================================================

alter table public.complaint_evidence enable row level security;
alter table public.admin_settings enable row level security;
alter table public.setting_history enable row level security;
alter table public.risk_flags enable row level security;
alter table public.app_versions enable row level security;


-- =========================================================
-- 8. COMPLAINT EVIDENCE RLS
-- =========================================================

drop policy if exists complaint_evidence_select_owner_admin
    on public.complaint_evidence;

create policy complaint_evidence_select_owner_admin
on public.complaint_evidence
for select
to authenticated
using (
    public.has_role('admin')
    or uploaded_by = auth.uid()
    or exists (
        select 1
        from public.complaints c
        where c.id = complaint_evidence.complaint_id
          and c.user_id = auth.uid()
    )
);


-- Evidence writes are backend controlled.


-- =========================================================
-- 9. ADMIN SETTINGS RLS
-- =========================================================

drop policy if exists admin_settings_select_admin
    on public.admin_settings;

create policy admin_settings_select_admin
on public.admin_settings
for select
to authenticated
using (
    public.has_role('admin')
);


-- Setting creation/update is backend controlled.


-- =========================================================
-- 10. SETTING HISTORY RLS
-- =========================================================

drop policy if exists setting_history_select_admin
    on public.setting_history;

create policy setting_history_select_admin
on public.setting_history
for select
to authenticated
using (
    public.has_role('admin')
);


-- Setting history is append-only.
-- No UPDATE policy.
-- No DELETE policy.
-- Inserts are backend controlled.


-- =========================================================
-- 11. RISK FLAGS RLS
-- =========================================================

drop policy if exists risk_flags_select_admin
    on public.risk_flags;

create policy risk_flags_select_admin
on public.risk_flags
for select
to authenticated
using (
    public.has_role('admin')
);


-- Risk detection and resolution are backend controlled.


-- =========================================================
-- 12. APP VERSIONS RLS
-- =========================================================

drop policy if exists app_versions_select_active_authenticated
    on public.app_versions;

create policy app_versions_select_active_authenticated
on public.app_versions
for select
to authenticated
using (
    public.has_role('admin')
    or is_active = true
);


-- Version management is admin/backend controlled.


-- =========================================================
-- 13. COMMENTS
-- =========================================================

comment on table public.complaint_evidence is
    'Evidence files attached to WASSLHA complaints.';

comment on table public.admin_settings is
    'Administrative configuration controlled by authorized administrators.';

comment on table public.setting_history is
    'Append-only before/after history for sensitive administrative settings.';

comment on table public.risk_flags is
    'Risk and fraud signals requiring administrative review.';

comment on table public.app_versions is
    'Supported application versions and minimum-version enforcement settings.';


-- =========================================================
-- 14. FINALIZE MIGRATION
-- =========================================================

commit;
