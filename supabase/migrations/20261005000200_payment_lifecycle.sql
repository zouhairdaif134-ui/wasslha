-- WASSLHA
-- Payments + Wallets + Financial Ledger
-- Production-grade transaction boundaries and idempotency.

begin;

create unique index if not exists payments_one_per_order_idx
on public.payments (master_order_id);

create or replace function public.initialize_order_payment(
  p_master_order_id uuid,
  p_customer_id uuid,
  p_idempotency_key text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.master_orders%rowtype;
  v_existing public.payments%rowtype;
  v_payment public.payments%rowtype;
begin
  if p_master_order_id is null
     or p_customer_id is null
     or length(trim(p_idempotency_key)) < 8 then
    raise exception 'INVALID_PAYMENT_INITIALIZATION';
  end if;

  select * into v_order
  from public.master_orders
  where id = p_master_order_id
  for update;

  if not found or v_order.customer_id <> p_customer_id then
    raise exception 'ORDER_ACCESS_DENIED';
  end if;

  select * into v_existing
  from public.payments
  where master_order_id = p_master_order_id
  limit 1;

  if found then
    return v_existing;
  end if;

  if v_order.payment_method <> 'online' then
    raise exception 'ONLINE_PAYMENT_NOT_REQUIRED';
  end if;

  if v_order.payment_status in ('paid','refunded') then
    raise exception 'ORDER_ALREADY_SETTLED';
  end if;

  insert into public.payments(
    master_order_id,
    customer_id,
    payment_method,
    status,
    amount_minor,
    currency,
    provider
  )
  values (
    v_order.id,
    v_order.customer_id,
    v_order.payment_method,
    'pending',
    v_order.total_minor,
    v_order.currency,
    'pending_provider'
  )
  returning * into v_payment;

  update public.master_orders
  set payment_status = 'pending',
      updated_at = now()
  where id = v_order.id;

  return v_payment;
end;
$$;

revoke all on function public.initialize_order_payment(uuid,uuid,text)
from public, anon, authenticated;
grant execute on function public.initialize_order_payment(uuid,uuid,text)
to service_role;

create or replace function public.record_payment_transaction(
  p_payment_id uuid,
  p_transaction_type text,
  p_status text,
  p_amount_minor integer,
  p_provider_transaction_id text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.payment_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_existing public.payment_transactions%rowtype;
  v_tx public.payment_transactions%rowtype;
  v_paid_amount bigint;
begin
  if p_payment_id is null
     or p_amount_minor <= 0
     or length(trim(p_idempotency_key)) < 8 then
    raise exception 'INVALID_PAYMENT_TRANSACTION';
  end if;

  select * into v_existing
  from public.payment_transactions
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return v_existing;
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  if p_status = 'succeeded'
     and p_transaction_type in ('capture','charge')
     and p_amount_minor > v_payment.amount_minor then
    raise exception 'PAYMENT_AMOUNT_EXCEEDS_ORDER';
  end if;

  insert into public.payment_transactions(
    payment_id,
    transaction_type,
    status,
    amount_minor,
    currency,
    provider_transaction_id,
    idempotency_key,
    metadata
  )
  values (
    p_payment_id,
    p_transaction_type,
    p_status,
    p_amount_minor,
    v_payment.currency,
    p_provider_transaction_id,
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_tx;

  if p_status = 'failed' then
    update public.payments
    set status = 'failed', updated_at = now()
    where id = v_payment.id;

    update public.master_orders
    set payment_status = 'failed', updated_at = now()
    where id = v_payment.master_order_id;

  elsif p_status = 'succeeded'
        and p_transaction_type in ('capture','charge') then

    select coalesce(sum(pt.amount_minor),0)
    into v_paid_amount
    from public.payment_transactions pt
    where pt.payment_id = v_payment.id
      and pt.status = 'succeeded'
      and pt.transaction_type in ('capture','charge');

    if v_paid_amount >= v_payment.amount_minor then
      update public.payments
      set status = 'paid', updated_at = now()
      where id = v_payment.id;

      update public.master_orders
      set payment_status = 'paid', updated_at = now()
      where id = v_payment.master_order_id;
    end if;
  end if;

  return v_tx;
end;
$$;

revoke all on function public.record_payment_transaction(
  uuid,text,text,integer,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.record_payment_transaction(
  uuid,text,text,integer,text,text,jsonb
) to service_role;

commit;
