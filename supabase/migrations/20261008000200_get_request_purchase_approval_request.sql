-- WASSLHA
-- Atomic rider request for customer approval when Get Request budget is exceeded

begin;

create or replace function public.request_get_request_purchase_approval(
  p_get_request_id uuid,
  p_rider_id uuid,
  p_requested_amount_minor bigint,
  p_idempotency_key text,
  p_reason text default null
)
returns public.purchase_approvals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.get_requests;
  v_existing public.purchase_approvals;
  v_approval public.purchase_approvals;
begin
  if p_requested_amount_minor <= 0 then
    raise exception using errcode = '22023', message = 'Requested amount must be positive';
  end if;

  if length(trim(coalesce(p_idempotency_key, ''))) < 8
     or length(trim(coalesce(p_idempotency_key, ''))) > 128 then
    raise exception using errcode = '22023', message = 'Invalid idempotency key';
  end if;

  select * into v_existing
  from public.purchase_approvals
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return v_existing;
  end if;

  select * into v_request
  from public.get_requests
  where id = p_get_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Get Request not found';
  end if;

  if v_request.status not in ('accepted', 'purchasing') then
    raise exception using errcode = 'P0001', message = 'Get Request is not ready for purchase approval';
  end if;

  if v_request.maximum_product_amount_minor is null
     or p_requested_amount_minor <= v_request.maximum_product_amount_minor then
    raise exception using errcode = '22023', message = 'Approval is only required above the customer budget';
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

  select * into v_existing
  from public.purchase_approvals
  where get_request_id = p_get_request_id
    and status = 'pending'
  for update;

  if found then
    return v_existing;
  end if;

  insert into public.purchase_approvals (
    get_request_id,
    requested_amount_minor,
    budget_amount_minor,
    status,
    requested_by,
    decision_reason,
    idempotency_key
  )
  values (
    p_get_request_id,
    p_requested_amount_minor,
    v_request.maximum_product_amount_minor,
    'pending',
    p_rider_id,
    nullif(trim(coalesce(p_reason, '')), ''),
    p_idempotency_key
  )
  returning * into v_approval;

  return v_approval;
end;
$$;

revoke all on function public.request_get_request_purchase_approval(uuid, uuid, bigint, text, text) from public, anon, authenticated;
grant execute on function public.request_get_request_purchase_approval(uuid, uuid, bigint, text, text) to service_role;

commit;
