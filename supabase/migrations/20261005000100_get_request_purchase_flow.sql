-- WASSLHA
-- Get Request purchase / receipt / approval workflow
-- Berrechid MVP

begin;

create table if not exists public.purchase_records (
  id uuid primary key default gen_random_uuid(),
  get_request_id uuid not null unique references public.get_requests(id) on delete restrict,
  rider_id uuid not null references public.riders(id) on delete restrict,
  actual_product_amount_minor bigint not null default 0 check (actual_product_amount_minor >= 0),
  reimbursement_amount_minor bigint not null default 0 check (reimbursement_amount_minor >= 0),
  delivery_fee_minor bigint not null default 0 check (delivery_fee_minor >= 0),
  service_fee_minor bigint not null default 0 check (service_fee_minor >= 0),
  total_amount_minor bigint not null default 0 check (total_amount_minor >= 0),
  currency text not null default 'MAD' check (currency = 'MAD'),
  status text not null default 'pending' check (status in ('pending','approved','purchased','reimbursed','failed','cancelled')),
  budget_exceeded boolean not null default false,
  idempotency_key text not null unique,
  purchased_at timestamptz,
  reimbursed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_records_rider_idx on public.purchase_records(rider_id, created_at desc);
create index if not exists purchase_records_status_idx on public.purchase_records(status, created_at asc);

drop trigger if exists purchase_records_set_updated_at on public.purchase_records;
create trigger purchase_records_set_updated_at before update on public.purchase_records for each row execute function public.set_updated_at();

create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_record_id uuid not null references public.purchase_records(id) on delete restrict,
  get_request_id uuid not null references public.get_requests(id) on delete restrict,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  storage_path text not null,
  receipt_number text,
  vendor_name text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'MAD' check (currency = 'MAD'),
  captured_at timestamptz not null default now(),
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists purchase_receipts_purchase_idx on public.purchase_receipts(purchase_record_id, created_at desc);
create index if not exists purchase_receipts_request_idx on public.purchase_receipts(get_request_id, created_at desc);

create table if not exists public.purchase_approvals (
  id uuid primary key default gen_random_uuid(),
  get_request_id uuid not null references public.get_requests(id) on delete restrict,
  purchase_record_id uuid references public.purchase_records(id) on delete restrict,
  requested_amount_minor bigint not null check (requested_amount_minor > 0),
  budget_amount_minor bigint not null check (budget_amount_minor >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  requested_by uuid not null references public.users(id) on delete restrict,
  decided_by uuid references public.users(id) on delete set null,
  decision_reason text,
  idempotency_key text not null unique,
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists purchase_approvals_request_idx on public.purchase_approvals(get_request_id, requested_at desc);
create index if not exists purchase_approvals_status_idx on public.purchase_approvals(status, requested_at asc);

alter table public.purchase_records enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.purchase_approvals enable row level security;

drop policy if exists purchase_records_select_authorized on public.purchase_records;
create policy purchase_records_select_authorized on public.purchase_records for select to authenticated using (
  (select public.has_role('admin'))
  or exists (select 1 from public.get_requests gr where gr.id = purchase_records.get_request_id and gr.customer_id = (select auth.uid()))
  or rider_id = (select auth.uid())
);

drop policy if exists purchase_receipts_select_authorized on public.purchase_receipts;
create policy purchase_receipts_select_authorized on public.purchase_receipts for select to authenticated using (
  (select public.has_role('admin'))
  or uploaded_by = (select auth.uid())
  or exists (select 1 from public.get_requests gr where gr.id = purchase_receipts.get_request_id and gr.customer_id = (select auth.uid()))
  or exists (select 1 from public.purchase_records pr where pr.id = purchase_receipts.purchase_record_id and pr.rider_id = (select auth.uid()))
);

drop policy if exists purchase_approvals_select_authorized on public.purchase_approvals;
create policy purchase_approvals_select_authorized on public.purchase_approvals for select to authenticated using (
  (select public.has_role('admin'))
  or requested_by = (select auth.uid())
  or exists (select 1 from public.get_requests gr where gr.id = purchase_approvals.get_request_id and gr.customer_id = (select auth.uid()))
  or exists (select 1 from public.purchase_records pr where pr.id = purchase_approvals.purchase_record_id and pr.rider_id = (select auth.uid()))
);

comment on table public.purchase_records is 'Actual purchase/reimbursement record for a Get Request.';
comment on table public.purchase_receipts is 'Receipt evidence for Get Request purchases; storage object itself remains private.';
comment on table public.purchase_approvals is 'Customer approval workflow when actual purchase exceeds the approved budget.';

commit;
