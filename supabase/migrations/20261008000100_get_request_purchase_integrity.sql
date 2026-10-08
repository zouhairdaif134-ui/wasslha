-- WASSLHA
-- Get Request purchase approval and receipt integrity
-- Production hardening: atomic rider/customer workflow

begin;

create unique index if not exists purchase_approvals_one_pending_per_request_idx
  on public.purchase_approvals(get_request_id)
  where status = 'pending';

alter table public.get_requests
  drop constraint if exists get_requests_status_check;

alter table public.get_requests
  add constraint get_requests_status_check
  check (
    status in (
      'pending',
      'searching',
      'accepted',
      'purchasing',
      'purchased',
      'picked_up',
      'delivering',
      'delivered',
      'cancelled',
      'rejected',
      'expired'
    )
  );

create or replace function public.approve_get_request_purchase(
  p_approval_id uuid,
  p_customer_id uuid,
  p_decision text,
  p_reason text default null
)
returns public.purchase_approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_approval public.purchase_approvals;
  v_request public.get_requests;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'Invalid approval decision';
  end if;

  select * into v_approval
  from public.purchase_approvals
  where id = p_approval_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Purchase approval not found';
  end if;

  if v_approval.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'Purchase approval is no longer pending';
  end if;

  select * into v_request
  from public.get_requests
  where id = v_approval.get_request_id
    and customer_id = p_customer_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Customer is not authorized for this request';
  end if;

  if p_decision = 'approved'
     and v_approval.requested_amount_minor <= v_approval.budget_amount_minor then
    raise exception using errcode = '22023', message = 'Approval is only required for an amount above the budget';
  end if;

  update public.purchase_approvals
  set status = p_decision,
      decided_by = p_customer_id,
      decision_reason = nullif(trim(coalesce(p_reason, '')), ''),
      decided_at = now()
  where id = v_approval.id
  returning * into v_approval;

  return v_approval;
end;
$$;

create or replace function public.create_get_request_purchase(
  p_get_request_id uuid,
  p_rider_id uuid,
  p_actual_product_amount_minor bigint,
  p_reimbursement_amount_minor bigint,
  p_delivery_fee_minor bigint,
  p_service_fee_minor bigint,
  p_total_amount_minor bigint,
  p_idempotency_key text
)
returns public.purchase_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.get_requests;
  v_purchase public.purchase_records;
  v_approval public.purchase_approvals;
  v_budget bigint;
  v_exceeded boolean;
begin
  if p_actual_product_amount_minor < 0
     or p_reimbursement_amount_minor < 0
     or p_delivery_fee_minor < 0
     or p_service_fee_minor < 0
     or p_total_amount_minor < 0 then
    raise exception using errcode = '22023', message = 'Financial amounts must be non-negative';
  end if;

  if p_reimbursement_amount_minor <> p_actual_product_amount_minor then
    raise exception using errcode = '22023', message = 'Reimbursement must equal actual product amount';
  end if;

  if p_total_amount_minor <> p_actual_product_amount_minor + p_delivery_fee_minor + p_service_fee_minor then
    raise exception using errcode = '22023', message = 'Total amount does not match purchase components';
  end if;

  if length(trim(coalesce(p_idempotency_key, ''))) < 8
     or length(trim(coalesce(p_idempotency_key, ''))) > 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;

  select * into v_purchase
  from public.purchase_records
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return v_purchase;
  end if;

  select * into v_request
  from public.get_requests
  where id = p_get_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Get Request not found';
  end if;

  if not exists (
    select 1
    from public.get_request_offers
    where get_request_id = p_get_request_id
      and rider_id = p_rider_id
      and status = 'accepted'
  ) then
    raise exception using errcode = '42501', message = 'Rider is not the accepted fulfiller';
  end if;

  if v_request.status not in ('accepted', 'purchasing') then
    raise exception using errcode = 'P0001', message = 'Get Request is not ready for purchase';
  end if;

  v_budget := v_request.maximum_product_amount_minor;
  v_exceeded := v_budget is not null and p_actual_product_amount_minor > v_budget;

  if v_exceeded then
    select * into v_approval
    from public.purchase_approvals
    where get_request_id = p_get_request_id
      and status = 'approved'
      and purchase_record_id is null
      and requested_amount_minor >= p_actual_product_amount_minor
    order by decided_at desc nulls last, requested_at desc
    limit 1
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'Customer approval is required before purchase';
    end if;
  end if;

  insert into public.purchase_records (
    get_request_id,
    rider_id,
    actual_product_amount_minor,
    reimbursement_amount_minor,
    delivery_fee_minor,
    service_fee_minor,
    total_amount_minor,
    currency,
    status,
    budget_exceeded,
    idempotency_key
  )
  values (
    p_get_request_id,
    p_rider_id,
    p_actual_product_amount_minor,
    p_reimbursement_amount_minor,
    p_delivery_fee_minor,
    p_service_fee_minor,
    p_total_amount_minor,
    'MAD',
    'approved',
    v_exceeded,
    p_idempotency_key
  )
  returning * into v_purchase;

  if v_exceeded then
    update public.purchase_approvals
    set purchase_record_id = v_purchase.id
    where id = v_approval.id;
  end if;

  if v_request.status = 'accepted' then
    update public.get_requests
    set status = 'purchasing'
    where id = v_request.id;

    insert into public.get_request_status_history (
      get_request_id, old_status, new_status, changed_by, reason
    )
    values (
      v_request.id, v_request.status, 'purchasing', p_rider_id, 'Purchase started'
    );
  end if;

  return v_purchase;
end;
$$;

create or replace function public.add_get_request_purchase_receipt(
  p_purchase_record_id uuid,
  p_get_request_id uuid,
  p_rider_id uuid,
  p_storage_path text,
  p_receipt_number text,
  p_vendor_name text,
  p_amount_minor bigint
)
returns public.purchase_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchase_records;
  v_receipt public.purchase_receipts;
  v_request public.get_requests;
begin
  select * into v_purchase
  from public.purchase_records
  where id = p_purchase_record_id
    and get_request_id = p_get_request_id
    and rider_id = p_rider_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Purchase record is not owned by the accepted rider';
  end if;

  if v_purchase.status not in ('approved', 'purchased') then
    raise exception using errcode = 'P0001', message = 'Purchase record is not ready for receipt';
  end if;

  if p_amount_minor <= 0 or p_amount_minor <> v_purchase.actual_product_amount_minor then
    raise exception using errcode = '22023', message = 'Receipt amount must equal actual product amount';
  end if;

  if not exists (
    select 1
    from public.get_request_offers
    where get_request_id = p_get_request_id
      and rider_id = p_rider_id
      and status = 'accepted'
  ) then
    raise exception using errcode = '42501', message = 'Rider is not the accepted fulfiller';
  end if;

  insert into public.purchase_receipts (
    purchase_record_id,
    get_request_id,
    uploaded_by,
    storage_path,
    receipt_number,
    vendor_name,
    amount_minor,
    currency
  )
  values (
    p_purchase_record_id,
    p_get_request_id,
    p_rider_id,
    trim(p_storage_path),
    nullif(trim(coalesce(p_receipt_number, '')), ''),
    nullif(trim(coalesce(p_vendor_name, '')), ''),
    p_amount_minor,
    'MAD'
  )
  returning * into v_receipt;

  update public.purchase_records
  set status = 'purchased',
      purchased_at = coalesce(purchased_at, now())
  where id = v_purchase.id;

  select * into v_request
  from public.get_requests
  where id = p_get_request_id
  for update;

  if v_request.status = 'purchasing' then
    update public.get_requests
    set status = 'purchased'
    where id = p_get_request_id;

    insert into public.get_request_status_history (
      get_request_id, old_status, new_status, changed_by, reason
    )
    values (
      p_get_request_id, v_request.status, 'purchased', p_rider_id, 'Purchase receipt recorded'
    );
  end if;

  return v_receipt;
end;
$$;

revoke all on function public.approve_get_request_purchase(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_get_request_purchase(uuid, uuid, bigint, bigint, bigint, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.add_get_request_purchase_receipt(uuid, uuid, uuid, text, text, text, bigint) from public, anon, authenticated;

grant execute on function public.approve_get_request_purchase(uuid, uuid, text, text) to service_role;
grant execute on function public.create_get_request_purchase(uuid, uuid, bigint, bigint, bigint, bigint, bigint, text) to service_role;
grant execute on function public.add_get_request_purchase_receipt(uuid, uuid, uuid, text, text, text, bigint) to service_role;

commit;
