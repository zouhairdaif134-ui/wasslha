-- WASSLHA
-- COD cash controls and merchant settlements.
-- Defaults are editable in admin_settings:
--   finance.merchant_commission_bps          (1500 = 15%; Glovo Morocco is capped at 30%, local competitor Kooul uses 10%)
--   finance.rider_cash_limit_minor           (100000 = 1000 MAD; above it a rider receives no COD offers until cash is handed over)
--   finance.merchant_settlement_safety_days  (2)

-- Defaults chosen from Moroccan market references: all values are editable in admin_settings.
insert into public.admin_settings (setting_key, setting_value, description, is_sensitive)
select v.k, v.val, v.descr, false
from (values
  ('finance.merchant_commission_bps', '1500'::jsonb, 'Merchant commission in basis points (1500 = 15%)'),
  ('finance.rider_cash_limit_minor', '100000'::jsonb, 'Maximum cash a rider may hold (minor units, 100000 = 1000 MAD). Above it the rider receives no COD offers until cash is handed over'),
  ('finance.merchant_settlement_safety_days', '2'::jsonb, 'Days to wait after an order before it can be included in a merchant settlement')
) as v(k, val, descr)
where not exists (select 1 from public.admin_settings s where s.setting_key = v.k);

-- Can the rider take one more COD order without exceeding the cash limit?
create or replace function public.rider_can_take_cod_order(p_rider_id uuid, p_order_total_minor bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_balance public.rider_cash_balances%rowtype;
  v_limit bigint := 100000;
begin
  select case when jsonb_typeof(setting_value) = 'number' then (setting_value #>> '{}')::numeric::bigint end
    into v_limit
    from public.admin_settings where setting_key = 'finance.rider_cash_limit_minor';
  v_limit := coalesce(v_limit, 100000);

  select * into v_balance from public.rider_cash_balances where rider_id = p_rider_id;
  if not found then
    return coalesce(p_order_total_minor, 0) <= v_limit;
  end if;
  if v_balance.status <> 'active' then
    return false;
  end if;
  return v_balance.balance_minor + coalesce(p_order_total_minor, 0) <= v_limit;
end;
$$;

revoke all on function public.rider_can_take_cod_order(uuid, bigint) from public, anon, authenticated;
grant execute on function public.rider_can_take_cod_order(uuid, bigint) to service_role;

-- Auto dispatch: skip riders who would exceed their cash limit on COD orders.
create or replace function public.dispatch_auto_offer_delivery(p_delivery_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
 v_delivery public.deliveries%rowtype; v_master public.master_orders%rowtype;
 v_rider public.riders%rowtype; v_assignment public.delivery_assignments%rowtype; v_distance_km numeric;
begin
 select * into v_delivery from public.deliveries where id=p_delivery_id for update;
 if not found then raise exception 'DELIVERY_NOT_FOUND'; end if;
 select * into v_master from public.master_orders where id=v_delivery.master_order_id for update;
 if not found then raise exception 'MASTER_ORDER_NOT_FOUND'; end if;
 if v_master.status<>'ready_for_pickup' then raise exception 'ORDER_NOT_READY_FOR_DISPATCH'; end if;

 if v_delivery.status='assigned' then
   update public.delivery_assignments set status='expired',responded_at=coalesce(responded_at,now())
    where delivery_id=p_delivery_id and status='offered' and offered_at<now()-interval '60 seconds';
   if not exists(select 1 from public.delivery_assignments where delivery_id=p_delivery_id and status='offered') then
     update public.deliveries set status='pending',updated_at=now() where id=p_delivery_id;
   end if;
 end if;

 select * into v_delivery from public.deliveries where id=p_delivery_id for update;
 if v_delivery.status<>'pending' then raise exception 'DELIVERY_NOT_AVAILABLE'; end if;
 if v_delivery.pickup_latitude is null or v_delivery.pickup_longitude is null then raise exception 'PICKUP_LOCATION_REQUIRED'; end if;

 select r.* into v_rider
 from public.riders r join public.users u on u.id=r.id
 join lateral(select rl.latitude,rl.longitude,rl.recorded_at from public.rider_locations rl where rl.rider_id=r.id order by rl.recorded_at desc limit 1) loc on true
 where u.is_active and r.status='approved' and r.is_online
   and loc.recorded_at>=now()-interval '2 minutes'
   and exists(select 1 from public.slot_attendance sa join public.rider_slots rs on rs.id=sa.slot_id where sa.rider_id=r.id and sa.status in ('scheduled','checked_in','late') and rs.status='open' and rs.slot_date=current_date and localtime>=rs.start_time and localtime<rs.end_time)
   and not exists(select 1 from public.delivery_assignments da where da.rider_id=r.id and da.status in ('offered','accepted'))
   and (v_master.payment_method<>'cod' or public.rider_can_take_cod_order(r.id, v_master.total_minor::bigint))
 order by power((loc.latitude::numeric-v_delivery.pickup_latitude),2)+power((loc.longitude::numeric-v_delivery.pickup_longitude)*cos(radians(v_delivery.pickup_latitude)),2)
 limit 1;

 if not found then raise exception 'NO_ELIGIBLE_RIDER'; end if;

 select sqrt(power((loc.latitude::numeric-v_delivery.pickup_latitude),2)+power((loc.longitude::numeric-v_delivery.pickup_longitude)*cos(radians(v_delivery.pickup_latitude)),2))*111.32
 into v_distance_km from public.rider_locations loc where loc.rider_id=v_rider.id order by loc.recorded_at desc limit 1;

 insert into public.delivery_assignments(delivery_id,rider_id,assigned_by,status) values(p_delivery_id,v_rider.id,null,'offered') returning * into v_assignment;
 update public.deliveries set status='assigned',updated_at=now() where id=p_delivery_id;
 insert into public.delivery_events(delivery_id,rider_id,event_type,metadata) values(p_delivery_id,v_rider.id,'assignment_offered',jsonb_build_object('dispatch_mode','auto','candidate_distance_km',round(v_distance_km,3),'offer_timeout_seconds',60));

 return jsonb_build_object('assignment_id',v_assignment.id,'delivery_id',p_delivery_id,'rider_id',v_rider.id,'status',v_assignment.status,'dispatch_mode','auto','candidate_distance_km',round(v_distance_km,3),'offer_timeout_seconds',60);
end;
$function$;

-- Rider: cash balance vs limit.
create or replace function public.rider_cash_status(p_rider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_balance bigint := 0;
  v_status text := 'active';
  v_limit bigint := 100000;
begin
  select case when jsonb_typeof(setting_value) = 'number' then (setting_value #>> '{}')::numeric::bigint end
    into v_limit from public.admin_settings where setting_key = 'finance.rider_cash_limit_minor';
  v_limit := coalesce(v_limit, 100000);
  select balance_minor, status into v_balance, v_status from public.rider_cash_balances where rider_id = p_rider_id;
  v_balance := coalesce(v_balance, 0);
  v_status := coalesce(v_status, 'active');
  return jsonb_build_object(
    'balance_minor', v_balance,
    'limit_minor', v_limit,
    'remaining_minor', greatest(v_limit - v_balance, 0),
    'status', v_status,
    'blocked', (v_status <> 'active' or v_balance >= v_limit)
  );
end;
$$;

revoke all on function public.rider_cash_status(uuid) from public, anon, authenticated;
grant execute on function public.rider_cash_status(uuid) to service_role;

-- Rider: how much cash to collect for each of his deliveries.
create or replace function public.rider_delivery_collect_info(p_rider_id uuid, p_delivery_ids uuid[])
returns table(delivery_id uuid, payment_method text, collect_minor bigint)
language sql
stable
security definer
set search_path = public
as $$
  select d.id,
         mo.payment_method::text,
         case when mo.payment_method = 'cod' and mo.payment_status <> 'paid' then mo.total_minor::bigint else 0::bigint end
    from public.deliveries d
    join public.master_orders mo on mo.id = d.master_order_id
   where d.id = any(p_delivery_ids)
     and exists (select 1 from public.delivery_assignments da where da.delivery_id = d.id and da.rider_id = p_rider_id);
$$;

revoke all on function public.rider_delivery_collect_info(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.rider_delivery_collect_info(uuid, uuid[]) to service_role;

-- Admin: the rider hands the collected cash over to the platform.
create or replace function public.record_rider_cash_handover(
  p_rider_id uuid, p_amount_minor bigint, p_admin_user_id uuid, p_idempotency_key text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.rider_cash_transactions%rowtype;
begin
  if not exists (
    select 1 from public.users u
      join public.user_roles ur on ur.user_id = u.id
      join public.roles r on r.id = ur.role_id
     where u.id = p_admin_user_id and u.is_active and r.code = 'admin'
  ) then
    raise exception 'ADMIN_NOT_AUTHORIZED';
  end if;

  v_tx := public.apply_rider_cash_transaction(
    p_rider_id, 'reimbursement', p_amount_minor, 'admin_handover', null,
    'handover:' || trim(p_idempotency_key), coalesce(p_note, 'Cash handed over to the platform'),
    jsonb_build_object('admin_user_id', p_admin_user_id)
  );

  return jsonb_build_object('transaction_id', v_tx.id, 'amount_minor', v_tx.amount_minor,
    'balance_before_minor', v_tx.balance_before_minor, 'balance_after_minor', v_tx.balance_after_minor);
end;
$$;

revoke all on function public.record_rider_cash_handover(uuid, bigint, uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_rider_cash_handover(uuid, bigint, uuid, text, text) to service_role;

-- Admin: build merchant settlements for a closed period (after the safety period).
create or replace function public.generate_merchant_settlements(p_period_start date, p_period_end date, p_admin_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_safety integer := 2;
  v_row record;
  v_created integer := 0;
  v_skipped integer := 0;
begin
  if not exists (
    select 1 from public.users u
      join public.user_roles ur on ur.user_id = u.id
      join public.roles r on r.id = ur.role_id
     where u.id = p_admin_user_id and u.is_active and r.code = 'admin'
  ) then
    raise exception 'ADMIN_NOT_AUTHORIZED';
  end if;
  if p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'INVALID_SETTLEMENT_PERIOD';
  end if;

  select case when jsonb_typeof(setting_value) = 'number' then (setting_value #>> '{}')::numeric::integer end
    into v_safety from public.admin_settings where setting_key = 'finance.merchant_settlement_safety_days';
  v_safety := greatest(coalesce(v_safety, 2), 0);

  if p_period_end > current_date - v_safety then
    raise exception 'PERIOD_NOT_SETTLEABLE';
  end if;

  for v_row in
    select s.merchant_id,
           coalesce(sum(fl.amount_minor) filter (where fl.entry_type = 'sale'), 0)::bigint as gross,
           coalesce(sum(fl.amount_minor) filter (where fl.entry_type = 'commission'), 0)::bigint as commission
      from public.financial_ledger fl
      join public.sub_orders so on so.id = fl.sub_order_id
      join public.stores s on s.id = so.store_id
     where fl.entry_type in ('sale', 'commission')
       and fl.created_at::date between p_period_start and p_period_end
     group by s.merchant_id
  loop
    if v_row.gross <= 0 or exists (
      select 1 from public.merchant_settlements ms
       where ms.merchant_id = v_row.merchant_id
         and ms.status <> 'cancelled'
         and ms.period_start <= p_period_end and ms.period_end >= p_period_start
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.merchant_settlements(merchant_id, period_start, period_end, gross_amount_minor, commission_minor,
      refund_minor, adjustment_minor, net_amount_minor, currency, status)
    values (v_row.merchant_id, p_period_start, p_period_end, v_row.gross, v_row.commission,
      0, 0, v_row.gross - v_row.commission, 'MAD', 'pending');
    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('created', v_created, 'skipped', v_skipped);
end;
$$;

revoke all on function public.generate_merchant_settlements(date, date, uuid) from public, anon, authenticated;
grant execute on function public.generate_merchant_settlements(date, date, uuid) to service_role;
