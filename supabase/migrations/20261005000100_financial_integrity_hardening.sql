-- WASSLHA
-- Finance integrity hardening
-- Payments + Wallets + Financial Ledger
--
-- Rules:
-- - Financial transaction history is immutable.
-- - Wallet balance changes are atomic and idempotent.
-- - Wallet transaction balances must reconcile.
-- - Rider earnings and merchant settlement totals are mathematically consistent.
-- - Financial RPCs are backend/service-role only.

begin;

create or replace function public.guard_immutable_financial_transaction()
returns trigger
language plpgsql
set search_path = public
as $
begin
  raise exception 'IMMUTABLE_FINANCIAL_RECORD';
end;
$$;

drop trigger if exists wallet_transactions_immutable on public.wallet_transactions;
create trigger wallet_transactions_immutable
before update or delete on public.wallet_transactions
for each row execute function public.guard_immutable_financial_transaction();

drop trigger if exists financial_ledger_immutable on public.financial_ledger;
create trigger financial_ledger_immutable
before update or delete on public.financial_ledger
for each row execute function public.guard_immutable_financial_transaction();

alter table public.payment_transactions
  drop constraint if exists payment_transactions_currency_mad;
alter table public.payment_transactions
  add constraint payment_transactions_currency_mad check (currency = 'MAD');

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_balance_flow;
alter table public.wallet_transactions
  add constraint wallet_transactions_balance_flow check (
    (transaction_type in ('credit','refund') and balance_after_minor = balance_before_minor + amount_minor)
    or
    (transaction_type in ('debit','withdrawal') and balance_after_minor = balance_before_minor - amount_minor)
    or
    (transaction_type = 'adjustment' and balance_after_minor >= 0)
  );

alter table public.rider_earnings
  drop constraint if exists rider_earnings_total_formula;
alter table public.rider_earnings
  add constraint rider_earnings_total_formula
  check (total_minor = amount_minor + bonus_minor + adjustment_minor);

alter table public.merchant_settlements
  drop constraint if exists merchant_settlements_net_formula;
alter table public.merchant_settlements
  add constraint merchant_settlements_net_formula
  check (net_amount_minor = gross_amount_minor - commission_minor - refund_minor + adjustment_minor);

create or replace function public.post_wallet_transaction(
  p_user_id uuid,
  p_transaction_type text,
  p_amount_minor bigint,
  p_idempotency_key text,
  p_reference_type text default null,
  p_reference_id uuid default null,
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
  v_row public.wallet_transactions%rowtype;
begin
  if p_user_id is null or p_amount_minor <= 0 or length(trim(p_idempotency_key)) < 8 then
    raise exception 'INVALID_WALLET_TRANSACTION';
  end if;

  select * into v_existing
  from public.wallet_transactions
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return v_existing;
  end if;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'WALLET_NOT_ACTIVE';
  end if;

  v_before := v_wallet.balance_minor;

  if p_transaction_type in ('credit','refund') then
    v_after := v_before + p_amount_minor;
  elsif p_transaction_type in ('debit','withdrawal') then
    v_after := v_before - p_amount_minor;
    if v_after < 0 then
      raise exception 'INSUFFICIENT_WALLET_BALANCE';
    end if;
  elsif p_transaction_type = 'adjustment' then
    raise exception 'ADJUSTMENT_REQUIRES_EXPLICIT_BALANCE';
  else
    raise exception 'INVALID_WALLET_TRANSACTION_TYPE';
  end if;

  update public.wallets
  set balance_minor = v_after, updated_at = now()
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
    p_reference_type, p_reference_id, p_idempotency_key,
    p_description, coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.post_wallet_transaction(uuid,text,bigint,text,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.post_wallet_transaction(uuid,text,bigint,text,text,uuid,text,jsonb) to service_role;

create or replace function public.post_financial_ledger_entry(
  p_entry_type text,
  p_direction text,
  p_amount_minor bigint,
  p_idempotency_key text,
  p_master_order_id uuid default null,
  p_sub_order_id uuid default null,
  p_payment_id uuid default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
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
  v_row public.financial_ledger%rowtype;
begin
  if p_amount_minor <= 0 or length(trim(p_idempotency_key)) < 8 then
    raise exception 'INVALID_LEDGER_ENTRY';
  end if;

  select * into v_existing
  from public.financial_ledger
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return v_existing;
  end if;

  insert into public.financial_ledger(
    master_order_id, sub_order_id, payment_id,
    entry_type, direction, amount_minor, currency,
    reference_type, reference_id, idempotency_key,
    description, metadata
  )
  values (
    p_master_order_id, p_sub_order_id, p_payment_id,
    p_entry_type, p_direction, p_amount_minor, 'MAD',
    p_reference_type, p_reference_id, p_idempotency_key,
    p_description, coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.post_financial_ledger_entry(text,text,bigint,text,uuid,uuid,uuid,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.post_financial_ledger_entry(text,text,bigint,text,uuid,uuid,uuid,text,uuid,text,jsonb) to service_role;

commit;
