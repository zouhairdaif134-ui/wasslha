-- WASSLHA
-- Finance hardening: payment idempotency, wallet atomicity, rider cash balance, ledger append-only

begin;

alter table public.payments
  add column if not exists initialization_idempotency_key text;

create unique index if not exists payments_initialization_idempotency_idx
  on public.payments(initialization_idempotency_key)
  where initialization_idempotency_key is not null;

create table if not exists public.rider_cash_balances (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete restrict,
  balance_minor bigint not null default 0,
  currency text not null default 'MAD',
  status text not null default 'active'
    check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rider_cash_balance_nonnegative check (balance_minor >= 0),
  constraint rider_cash_balance_currency_mad check (currency = 'MAD')
);

create unique index if not exists rider_cash_balances_rider_unique_idx
  on public.rider_cash_balances(rider_id);

create table if not exists public.rider_cash_transactions (
  id uuid primary key default gen_random_uuid(),
  rider_cash_balance_id uuid not null references public.rider_cash_balances(id) on delete restrict,
  transaction_type text not null
    check (transaction_type in ('cash_collection','reimbursement','adjustment','deposit','withdrawal')),
  amount_minor bigint not null,
  balance_before_minor bigint not null,
  balance_after_minor bigint not null,
  reference_type text,
  reference_id uuid,
  idempotency_key text not null unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint rider_cash_tx_amount_positive check (amount_minor > 0),
  constraint rider_cash_tx_balance_before_nonnegative check (balance_before_minor >= 0),
  constraint rider_cash_tx_balance_after_nonnegative check (balance_after_minor >= 0)
);

create index if not exists rider_cash_transactions_balance_idx
  on public.rider_cash_transactions(rider_cash_balance_id, created_at desc);

create index if not exists rider_cash_transactions_reference_idx
  on public.rider_cash_transactions(reference_type, reference_id);

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
     or length(trim(coalesce(p_idempotency_key,''))) < 8
     or length(trim(coalesce(p_idempotency_key,''))) > 128 then
    raise exception 'INVALID_PAYMENT_INITIALIZATION';
  end if;

  select * into v_existing
  from public.payments
  where initialization_idempotency_key = p_idempotency_key
  limit 1;

  if found then
    if v_existing.master_order_id <> p_master_order_id
       or v_existing.customer_id <> p_customer_id then
      raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing;
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
    if v_existing.customer_id <> p_customer_id then
      raise exception 'ORDER_ACCESS_DENIED';
    end if;
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
    provider,
    initialization_idempotency_key
  )
  values (
    v_order.id,
    v_order.customer_id,
    v_order.payment_method,
    'pending',
    v_order.total_minor,
    v_order.currency,
    'pending_provider',
    trim(p_idempotency_key)
  )
  returning * into v_payment;

  update public.master_orders
  set payment_status = 'pending',
      updated_at = now()
  where id = v_order.id;

  return v_payment;
exception
  when unique_violation then
    select * into v_existing
    from public.payments
    where initialization_idempotency_key = trim(p_idempotency_key)
    limit 1;

    if found then
      return v_existing;
    end if;
    raise;
end;
$$;

create or replace function public.apply_wallet_transaction(
  p_user_id uuid,
  p_transaction_type text,
  p_amount_minor bigint,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
  v_existing public.wallet_transactions%rowtype;
  v_before bigint;
  v_after bigint;
begin
  if p_amount_minor <= 0
     or p_transaction_type not in ('credit','debit','refund','adjustment','withdrawal')
     or length(trim(coalesce(p_idempotency_key,''))) < 8
     or length(trim(coalesce(p_idempotency_key,''))) > 128 then
    raise exception 'INVALID_WALLET_TRANSACTION';
  end if;

  select * into v_existing
  from public.wallet_transactions
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if found then
    return v_existing;
  end if;

  insert into public.wallets(user_id, balance_minor, currency, status)
  values (p_user_id, 0, 'MAD', 'active')
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_wallet.status <> 'active' then
    raise exception 'WALLET_NOT_ACTIVE';
  end if;

  v_before := v_wallet.balance_minor;

  if p_transaction_type in ('debit','withdrawal') then
    if v_before < p_amount_minor then
      raise exception 'INSUFFICIENT_WALLET_BALANCE';
    end if;
    v_after := v_before - p_amount_minor;
  else
    v_after := v_before + p_amount_minor;
  end if;

  update public.wallets
  set balance_minor = v_after,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions(
    wallet_id, transaction_type, amount_minor,
    balance_before_minor, balance_after_minor,
    reference_type, reference_id, idempotency_key,
    description, metadata
  )
  values (
    v_wallet.id, p_transaction_type, p_amount_minor,
    v_before, v_after,
    p_reference_type, p_reference_id, trim(p_idempotency_key),
    p_description, coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into v_existing;

  return v_existing;
exception
  when unique_violation then
    select * into v_existing
    from public.wallet_transactions
    where idempotency_key = trim(p_idempotency_key)
    limit 1;
    if found then return v_existing; end if;
    raise;
end;
$$;

create or replace function public.append_financial_ledger_entry(
  p_master_order_id uuid,
  p_sub_order_id uuid,
  p_payment_id uuid,
  p_entry_type text,
  p_direction text,
  p_amount_minor bigint,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.financial_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.financial_ledger%rowtype;
begin
  if p_amount_minor <= 0
     or p_direction not in ('debit','credit')
     or p_entry_type not in ('sale','delivery_fee','discount','commission','rider_earning','merchant_payable','payment','refund','adjustment')
     or length(trim(coalesce(p_idempotency_key,''))) < 8
     or length(trim(coalesce(p_idempotency_key,''))) > 128 then
    raise exception 'INVALID_LEDGER_ENTRY';
  end if;

  select * into v_existing
  from public.financial_ledger
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if found then return v_existing; end if;

  insert into public.financial_ledger(
    master_order_id, sub_order_id, payment_id,
    entry_type, direction, amount_minor, currency,
    reference_type, reference_id, idempotency_key,
    description, metadata
  )
  values (
    p_master_order_id, p_sub_order_id, p_payment_id,
    p_entry_type, p_direction, p_amount_minor, 'MAD',
    p_reference_type, p_reference_id, trim(p_idempotency_key),
    p_description, coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into v_existing;

  return v_existing;
exception
  when unique_violation then
    select * into v_existing
    from public.financial_ledger
    where idempotency_key = trim(p_idempotency_key)
    limit 1;
    if found then return v_existing; end if;
    raise;
end;
$$;

create or replace function public.apply_rider_cash_transaction(
  p_rider_id uuid,
  p_transaction_type text,
  p_amount_minor bigint,
  p_reference_type text,
  p_reference_id uuid,
  p_idempotency_key text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.rider_cash_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.rider_cash_balances%rowtype;
  v_existing public.rider_cash_transactions%rowtype;
  v_before bigint;
  v_after bigint;
begin
  if p_amount_minor <= 0
     or p_transaction_type not in ('cash_collection','reimbursement','adjustment','deposit','withdrawal')
     or length(trim(coalesce(p_idempotency_key,''))) < 8
     or length(trim(coalesce(p_idempotency_key,''))) > 128 then
    raise exception 'INVALID_RIDER_CASH_TRANSACTION';
  end if;

  select * into v_existing
  from public.rider_cash_transactions
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if found then return v_existing; end if;

  insert into public.rider_cash_balances(rider_id, balance_minor, currency, status)
  values (p_rider_id, 0, 'MAD', 'active')
  on conflict (rider_id) do nothing;

  select * into v_balance
  from public.rider_cash_balances
  where rider_id = p_rider_id
  for update;

  if v_balance.status <> 'active' then
    raise exception 'RIDER_CASH_BALANCE_NOT_ACTIVE';
  end if;

  v_before := v_balance.balance_minor;

  if p_transaction_type in ('reimbursement','withdrawal') then
    if v_before < p_amount_minor then
      raise exception 'INSUFFICIENT_RIDER_CASH_BALANCE';
    end if;
    v_after := v_before - p_amount_minor;
  else
    v_after := v_before + p_amount_minor;
  end if;

  update public.rider_cash_balances
  set balance_minor = v_after,
      updated_at = now()
  where id = v_balance.id;

  insert into public.rider_cash_transactions(
    rider_cash_balance_id, transaction_type, amount_minor,
    balance_before_minor, balance_after_minor,
    reference_type, reference_id, idempotency_key,
    description, metadata
  )
  values (
    v_balance.id, p_transaction_type, p_amount_minor,
    v_before, v_after,
    p_reference_type, p_reference_id, trim(p_idempotency_key),
    p_description, coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into v_existing;

  return v_existing;
exception
  when unique_violation then
    select * into v_existing
    from public.rider_cash_transactions
    where idempotency_key = trim(p_idempotency_key)
    limit 1;
    if found then return v_existing; end if;
    raise;
end;
$$;

revoke all on function public.initialize_order_payment(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.apply_wallet_transaction(uuid,text,bigint,text,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.append_financial_ledger_entry(uuid,uuid,uuid,text,text,bigint,text,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.apply_rider_cash_transaction(uuid,text,bigint,text,uuid,text,text,jsonb) from public,anon,authenticated;

grant execute on function public.initialize_order_payment(uuid,uuid,text) to service_role;
grant execute on function public.apply_wallet_transaction(uuid,text,bigint,text,uuid,text,text,jsonb) to service_role;
grant execute on function public.append_financial_ledger_entry(uuid,uuid,uuid,text,text,bigint,text,uuid,text,text,jsonb) to service_role;
grant execute on function public.apply_rider_cash_transaction(uuid,text,bigint,text,uuid,text,text,jsonb) to service_role;

alter table public.rider_cash_balances enable row level security;
alter table public.rider_cash_transactions enable row level security;

drop policy if exists rider_cash_balances_select_own_admin on public.rider_cash_balances;
create policy rider_cash_balances_select_own_admin
on public.rider_cash_balances for select to authenticated
using (public.has_role('admin') or rider_id = auth.uid());

drop policy if exists rider_cash_transactions_select_own_admin on public.rider_cash_transactions;
create policy rider_cash_transactions_select_own_admin
on public.rider_cash_transactions for select to authenticated
using (
  public.has_role('admin')
  or exists (
    select 1 from public.rider_cash_balances b
    where b.id = rider_cash_transactions.rider_cash_balance_id
      and b.rider_id = auth.uid()
  )
);

drop trigger if exists rider_cash_balances_set_updated_at on public.rider_cash_balances;
create trigger rider_cash_balances_set_updated_at
before update on public.rider_cash_balances
for each row execute function public.set_updated_at();

commit;
