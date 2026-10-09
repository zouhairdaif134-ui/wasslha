-- WASSLHA
-- COD order completion + stock restore on cancellation.
--
-- A. Restore stock when a sub-order is cancelled before pickup (stock is
--    decremented at order creation and was never given back).
-- B. One rider earning per delivery.
-- C. When the last delivery of a COD order is delivered: capture the COD
--    payment, record the cash collected by the rider (rider cash balance),
--    create the rider earning and post the financial ledger entries.
--    A sweep function retries any delivered COD order that was not finalized.

begin;

-- A. Restore stock when a sub-order is cancelled before pickup.
create or replace function public.restore_stock_on_sub_order_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' then
    return new;
  end if;
  if old.status not in ('pending','confirmed','preparing','ready_for_pickup','assigned') then
    return new;
  end if;

  for v_item in
    select oi.id, oi.product_id, oi.quantity
      from public.order_items oi
     where oi.sub_order_id = new.id
  loop
    if exists (select 1 from public.order_item_variants oiv where oiv.order_item_id = v_item.id) then
      update public.product_variants pv
         set stock_quantity = pv.stock_quantity + oiv.quantity
        from public.order_item_variants oiv
       where oiv.order_item_id = v_item.id
         and pv.id = oiv.product_variant_id;
    else
      update public.products p
         set stock_quantity = p.stock_quantity + v_item.quantity
       where p.id = v_item.product_id;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.restore_stock_on_sub_order_cancel() from public, anon, authenticated;

drop trigger if exists trg_restore_stock_on_sub_order_cancel on public.sub_orders;
create trigger trg_restore_stock_on_sub_order_cancel
  after update of status on public.sub_orders
  for each row
  when (new.status = 'cancelled' and old.status is distinct from new.status)
  execute function public.restore_stock_on_sub_order_cancel();

-- B. One earning row per delivery.
create unique index if not exists rider_earnings_delivery_id_key
  on public.rider_earnings (delivery_id)
  where delivery_id is not null;

-- C. COD completion: payment capture, rider cash collection, rider earning, ledger.
-- Ledger convention (metadata.group):
--   receipt    : payment (debit)  = cash received from the customer
--   component  : sale, delivery_fee, adjustment(service_fee|tip) = credit ; discount = debit
--                receipt = sum(component credits) - discount
--   allocation : commission (debit, merchant), merchant_payable (credit, merchant),
--                rider_earning (credit, rider); merchant_payable + commission = sale
-- Settings (admin_settings): finance.merchant_commission_bps (default 0),
--                            finance.rider_base_minor (default = delivery fee).
create or replace function public.finalize_delivered_order_financials(p_master_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.master_orders%rowtype;
  v_payment public.payments%rowtype;
  v_rider_id uuid;
  v_delivery_id uuid;
  v_bps integer := 0;
  v_rider_base bigint;
  v_earning bigint;
  v_sub record;
  v_commission bigint;
  v_key text := 'cod:' || p_master_order_id::text;
begin
  select * into v_order from public.master_orders where id = p_master_order_id for update;
  if not found then
    raise exception 'MASTER_ORDER_NOT_FOUND';
  end if;
  if v_order.status <> 'delivered' then
    return jsonb_build_object('skipped', 'not_delivered');
  end if;
  if v_order.payment_method <> 'cod' then
    return jsonb_build_object('skipped', 'not_cod');
  end if;
  if v_order.total_minor <= 0 then
    return jsonb_build_object('skipped', 'zero_total');
  end if;
  if exists (select 1 from public.financial_ledger where idempotency_key = v_key || ':payment') then
    return jsonb_build_object('skipped', 'already_finalized');
  end if;

  select d.id, da.rider_id
    into v_delivery_id, v_rider_id
    from public.deliveries d
    join public.delivery_assignments da on da.delivery_id = d.id and da.status = 'completed'
   where d.master_order_id = p_master_order_id
   order by d.delivered_at desc nulls last, da.completed_at desc nulls last
   limit 1;
  if v_rider_id is null then
    raise exception 'NO_COMPLETED_RIDER_FOR_ORDER';
  end if;

  select least(greatest(case when jsonb_typeof(setting_value) = 'number' then (setting_value #>> '{}')::numeric::integer end, 0), 10000)
    into v_bps
    from public.admin_settings where setting_key = 'finance.merchant_commission_bps';
  v_bps := coalesce(v_bps, 0);

  select case when jsonb_typeof(setting_value) = 'number' then greatest((setting_value #>> '{}')::numeric::bigint, 0) end
    into v_rider_base
    from public.admin_settings where setting_key = 'finance.rider_base_minor';
  v_rider_base := coalesce(v_rider_base, v_order.delivery_fee_minor::bigint);
  v_earning := v_rider_base + v_order.tip_minor::bigint;

  -- 1. COD payment captured
  select * into v_payment from public.payments where master_order_id = p_master_order_id limit 1;
  if not found then
    insert into public.payments(master_order_id, customer_id, payment_method, status, amount_minor, currency, provider, initialization_idempotency_key)
    values (v_order.id, v_order.customer_id, 'cod', 'pending', v_order.total_minor, 'MAD', 'cod', v_key || ':init')
    returning * into v_payment;
  end if;
  perform public.record_payment_transaction(
    v_payment.id, 'capture', 'succeeded', v_order.total_minor,
    'cod-' || p_master_order_id::text, v_key || ':capture',
    jsonb_build_object('source', 'cod_delivery', 'rider_id', v_rider_id)
  );

  -- 2. Cash is now held by the rider
  perform public.apply_rider_cash_transaction(
    v_rider_id, 'cash_collection', v_order.total_minor::bigint, 'master_order', p_master_order_id,
    v_key || ':cash', 'COD cash collected on delivery',
    jsonb_build_object('delivery_id', v_delivery_id)
  );

  -- 3. Rider earning
  if v_earning > 0 then
    insert into public.rider_earnings(rider_id, delivery_id, amount_minor, bonus_minor, adjustment_minor, total_minor, currency, status)
    values (v_rider_id, v_delivery_id, v_earning, 0, 0, v_earning, 'MAD', 'pending')
    on conflict (delivery_id) where delivery_id is not null do nothing;
  end if;

  -- 4. Ledger
  perform public.post_financial_ledger_entry('payment', 'debit', v_order.total_minor::bigint, v_key || ':payment',
    v_order.id, null, v_payment.id, 'master_order', v_order.id, 'COD cash received from customer',
    jsonb_build_object('group', 'receipt', 'party', 'customer', 'rider_id', v_rider_id));

  for v_sub in
    select so.id, so.subtotal_minor
      from public.sub_orders so
     where so.master_order_id = p_master_order_id and so.status <> 'cancelled'
  loop
    if v_sub.subtotal_minor > 0 then
      v_commission := (v_sub.subtotal_minor::bigint * v_bps + 5000) / 10000;
      perform public.post_financial_ledger_entry('sale', 'credit', v_sub.subtotal_minor::bigint, v_key || ':sale:' || v_sub.id::text,
        v_order.id, v_sub.id, v_payment.id, 'sub_order', v_sub.id, 'Merchant sale',
        jsonb_build_object('group', 'component', 'party', 'merchant'));
      if v_commission > 0 then
        perform public.post_financial_ledger_entry('commission', 'debit', v_commission, v_key || ':commission:' || v_sub.id::text,
          v_order.id, v_sub.id, v_payment.id, 'sub_order', v_sub.id, 'Platform commission',
          jsonb_build_object('group', 'allocation', 'party', 'merchant', 'bps', v_bps));
      end if;
      if v_sub.subtotal_minor::bigint - v_commission > 0 then
        perform public.post_financial_ledger_entry('merchant_payable', 'credit', v_sub.subtotal_minor::bigint - v_commission, v_key || ':payable:' || v_sub.id::text,
          v_order.id, v_sub.id, v_payment.id, 'sub_order', v_sub.id, 'Net amount owed to merchant',
          jsonb_build_object('group', 'allocation', 'party', 'merchant'));
      end if;
    end if;
  end loop;

  if v_order.delivery_fee_minor > 0 then
    perform public.post_financial_ledger_entry('delivery_fee', 'credit', v_order.delivery_fee_minor::bigint, v_key || ':delivery_fee',
      v_order.id, null, v_payment.id, 'master_order', v_order.id, 'Delivery fee',
      jsonb_build_object('group', 'component', 'party', 'platform'));
  end if;
  if v_order.service_fee_minor > 0 then
    perform public.post_financial_ledger_entry('adjustment', 'credit', v_order.service_fee_minor::bigint, v_key || ':service_fee',
      v_order.id, null, v_payment.id, 'master_order', v_order.id, 'Service fee',
      jsonb_build_object('group', 'component', 'party', 'platform', 'kind', 'service_fee'));
  end if;
  if v_order.tip_minor > 0 then
    perform public.post_financial_ledger_entry('adjustment', 'credit', v_order.tip_minor::bigint, v_key || ':tip',
      v_order.id, null, v_payment.id, 'master_order', v_order.id, 'Customer tip',
      jsonb_build_object('group', 'component', 'party', 'rider', 'kind', 'tip'));
  end if;
  if v_order.discount_minor > 0 then
    perform public.post_financial_ledger_entry('discount', 'debit', v_order.discount_minor::bigint, v_key || ':discount',
      v_order.id, null, v_payment.id, 'master_order', v_order.id, 'Order discount',
      jsonb_build_object('group', 'component', 'party', 'platform'));
  end if;
  if v_earning > 0 then
    perform public.post_financial_ledger_entry('rider_earning', 'credit', v_earning, v_key || ':rider_earning',
      v_order.id, null, v_payment.id, 'delivery', v_delivery_id, 'Rider earning',
      jsonb_build_object('group', 'allocation', 'party', 'rider', 'rider_id', v_rider_id));
  end if;

  return jsonb_build_object('finalized', true, 'rider_id', v_rider_id, 'cash_collected_minor', v_order.total_minor,
    'rider_earning_minor', v_earning, 'commission_bps', v_bps);
end;
$$;

revoke all on function public.finalize_delivered_order_financials(uuid) from public, anon, authenticated;
grant execute on function public.finalize_delivered_order_financials(uuid) to service_role;

-- Sweep: finalizes delivered COD orders whose financials were not recorded.
create or replace function public.finalize_delivered_cod_orders(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_ok integer := 0;
  v_failed integer := 0;
begin
  for v_order in
    select mo.id
      from public.master_orders mo
     where mo.status = 'delivered'
       and mo.payment_method = 'cod'
       and mo.total_minor > 0
       and not exists (
         select 1 from public.financial_ledger fl
          where fl.idempotency_key = 'cod:' || mo.id::text || ':payment'
       )
     order by mo.updated_at
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
     for update skip locked
  loop
    begin
      perform public.finalize_delivered_order_financials(v_order.id);
      v_ok := v_ok + 1;
    exception when others then
      v_failed := v_failed + 1;
      raise warning 'finalize_delivered_cod_orders failed for order %: %', v_order.id, sqlerrm;
    end;
  end loop;
  return jsonb_build_object('finalized', v_ok, 'failed', v_failed);
end;
$$;

revoke all on function public.finalize_delivered_cod_orders(integer) from public, anon, authenticated;
grant execute on function public.finalize_delivered_cod_orders(integer) to service_role;

-- Hook: record financials as soon as the last delivery completes.
create or replace function public.rider_transition_delivery_status(p_delivery_id uuid, p_rider_id uuid, p_new_status text, p_reason text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    v_delivery public.deliveries%rowtype;
    v_assignment public.delivery_assignments%rowtype;
    v_master public.master_orders%rowtype;
    v_all boolean;
    v_master_status text;
begin
    if p_new_status not in ('at_pickup','picked_up','in_transit','delivered','failed','cancelled') then
        raise exception 'INVALID_DELIVERY_STATUS';
    end if;

    select * into v_assignment from public.delivery_assignments
     where delivery_id = p_delivery_id and rider_id = p_rider_id and status = 'accepted'
     order by responded_at desc nulls last, created_at desc limit 1;
    if not found then raise exception 'DELIVERY_NOT_ASSIGNED_TO_RIDER'; end if;

    select * into v_delivery from public.deliveries where id = p_delivery_id for update;
    if not found then raise exception 'DELIVERY_NOT_FOUND'; end if;

    if p_new_status = v_delivery.status then raise exception 'DELIVERY_STATUS_UNCHANGED'; end if;
    if p_new_status = 'at_pickup' and v_delivery.status <> 'accepted' then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;
    if p_new_status = 'picked_up' and v_delivery.status not in ('accepted','at_pickup') then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;
    if p_new_status = 'in_transit' and v_delivery.status <> 'picked_up' then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;
    if p_new_status = 'delivered' and v_delivery.status <> 'in_transit' then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;
    if p_new_status in ('failed','cancelled') and v_delivery.status in ('delivered','cancelled') then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;

    update public.deliveries
       set status = p_new_status,
           started_at = case when p_new_status = 'at_pickup' then coalesce(started_at, now()) else started_at end,
           picked_up_at = case when p_new_status = 'picked_up' then coalesce(picked_up_at, now()) else picked_up_at end,
           delivered_at = case when p_new_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
           cancelled_at = case when p_new_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
           updated_at = now()
     where id = p_delivery_id;

    insert into public.delivery_events(delivery_id,rider_id,event_type,metadata)
    values (
      p_delivery_id,p_rider_id,
      case p_new_status
        when 'at_pickup' then 'arrived_pickup'
        when 'picked_up' then 'pickup_confirmed'
        when 'in_transit' then 'departed_pickup'
        when 'delivered' then 'delivery_confirmed'
        when 'failed' then 'delivery_failed'
        when 'cancelled' then 'delivery_failed'
      end,
      jsonb_build_object('reason',p_reason)
    );

    select * into v_master from public.master_orders where id = v_delivery.master_order_id for update;

    if p_new_status = 'picked_up' then
      select not exists(select 1 from public.deliveries d where d.master_order_id=v_delivery.master_order_id and d.status not in ('picked_up','in_transit','delivered')) into v_all;
      if v_all and v_master.status='assigned' then perform public.transition_master_order_status(v_master.id,'picked_up',p_rider_id,'All deliveries picked up'); end if;
    elsif p_new_status = 'in_transit' then
      select not exists(select 1 from public.deliveries d where d.master_order_id=v_delivery.master_order_id and d.status not in ('in_transit','delivered')) into v_all;
      if v_all and v_master.status='picked_up' then perform public.transition_master_order_status(v_master.id,'out_for_delivery',p_rider_id,'All deliveries in transit'); end if;
    elsif p_new_status = 'delivered' then
      select not exists(select 1 from public.deliveries d where d.master_order_id=v_delivery.master_order_id and d.status <> 'delivered') into v_all;
      if v_all and v_master.status='out_for_delivery' then
        perform public.transition_master_order_status(v_master.id,'delivered',p_rider_id,'All deliveries delivered');
        begin
          perform public.finalize_delivered_order_financials(v_master.id);
        exception when others then
          raise warning 'finalize_delivered_order_financials failed for order %: %', v_master.id, sqlerrm;
        end;
      end if;
    end if;

    return jsonb_build_object('delivery_id',p_delivery_id,'status',p_new_status,'master_order_id',v_delivery.master_order_id);
end;
$function$;

commit;
