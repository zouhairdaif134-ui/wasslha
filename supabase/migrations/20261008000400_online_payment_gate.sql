-- WASSLHA
-- Online payment gate (Master section 9: online payment is paid in full upfront).
-- An online order cannot leave "pending" (except to "cancelled") until its
-- payment_status is "paid". Enforced at database level so no code path
-- (merchant API, admin, sync functions, dispatch) can bypass it.
-- Cash on Delivery orders are not affected.

begin;

create or replace function public.enforce_online_payment_before_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_method text;
  v_payment_status text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status::text <> 'pending' or new.status::text = 'cancelled' then
    return new;
  end if;

  if tg_table_name = 'master_orders' then
    v_method := new.payment_method::text;
    v_payment_status := new.payment_status::text;
  else
    select mo.payment_method::text, mo.payment_status::text
      into v_method, v_payment_status
      from public.master_orders mo
     where mo.id = new.master_order_id;
  end if;

  if v_method = 'online' and coalesce(v_payment_status, '') <> 'paid' then
    raise exception 'ORDER_PAYMENT_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_online_payment_before_confirmation()
  from public, anon, authenticated;

drop trigger if exists trg_enforce_online_payment_master_orders on public.master_orders;
create trigger trg_enforce_online_payment_master_orders
  before update of status on public.master_orders
  for each row
  execute function public.enforce_online_payment_before_confirmation();

drop trigger if exists trg_enforce_online_payment_sub_orders on public.sub_orders;
create trigger trg_enforce_online_payment_sub_orders
  before update of status on public.sub_orders
  for each row
  execute function public.enforce_online_payment_before_confirmation();

comment on function public.enforce_online_payment_before_confirmation() is
  'Blocks leaving pending for online orders until payment_status = paid. Cancellation stays allowed.';

commit;
