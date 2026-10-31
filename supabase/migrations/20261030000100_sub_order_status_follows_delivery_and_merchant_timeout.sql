-- WASSLHA
-- Sub-order status follows the delivery + merchant confirmation timeout
--
-- 1) rider_transition_delivery_status moves the MASTER order (picked_up -> out_for_delivery -> delivered) but nothing
--    moved its sub-orders, so the merchant dashboard showed delivered orders as "ready for pickup" forever.
--    The master status now cascades to its open sub-orders (and delivered orders are backfilled).
-- 2) Merchant confirmation timeout: an order nobody confirms must not stay "pending" forever.
--    admin_settings marketplace.merchant_confirmation_timeout_minutes: 0 = disabled (default). Paid orders are never
--    auto-cancelled (they need the refund flow). Called every minute by the API cron.

begin;

create or replace function public.cascade_master_status_to_sub_orders()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
    if new.status is not distinct from old.status then
        return new;
    end if;

    if new.status = 'picked_up' then
        update public.sub_orders
           set status = 'picked_up'
         where master_order_id = new.id
           and status in ('ready_for_pickup', 'assigned');
    elsif new.status = 'out_for_delivery' then
        update public.sub_orders
           set status = 'out_for_delivery'
         where master_order_id = new.id
           and status in ('ready_for_pickup', 'assigned', 'picked_up');
    elsif new.status = 'delivered' then
        update public.sub_orders
           set status = 'delivered',
               delivered_at = coalesce(delivered_at, now())
         where master_order_id = new.id
           and status not in ('delivered', 'cancelled');
    end if;

    return new;
end;
$function$;

revoke all on function public.cascade_master_status_to_sub_orders() from public, anon, authenticated;

drop trigger if exists trg_cascade_master_status_to_sub_orders on public.master_orders;
create trigger trg_cascade_master_status_to_sub_orders
  after update of status on public.master_orders
  for each row execute function public.cascade_master_status_to_sub_orders();

update public.sub_orders so
   set status = 'delivered',
       delivered_at = coalesce(so.delivered_at, now())
  from public.master_orders mo
 where mo.id = so.master_order_id
   and mo.status = 'delivered'
   and so.status not in ('delivered', 'cancelled');

insert into public.admin_settings (setting_key, setting_value, description, is_sensitive)
select 'marketplace.merchant_confirmation_timeout_minutes', '0'::jsonb,
       'Minutes a merchant has to confirm a new order before it is cancelled automatically (0 = disabled).', false
 where not exists (
    select 1 from public.admin_settings where setting_key = 'marketplace.merchant_confirmation_timeout_minutes'
 );

create or replace function public.expire_unconfirmed_sub_orders()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    v_minutes integer;
    v_sub record;
    v_count integer := 0;
begin
    select coalesce((
        select (s.setting_value #>> '{}')::integer
          from public.admin_settings s
         where s.setting_key = 'marketplace.merchant_confirmation_timeout_minutes'
    ), 0) into v_minutes;

    if v_minutes <= 0 then
        return 0;
    end if;

    for v_sub in
        select so.id, so.master_order_id
          from public.sub_orders so
          join public.master_orders mo on mo.id = so.master_order_id
         where so.status = 'pending'
           and mo.payment_status <> 'paid'
           and so.created_at < now() - make_interval(mins => v_minutes)
         order by so.created_at
         limit 50
    loop
        begin
            perform public.transition_sub_order_status(
                v_sub.id, 'cancelled', null, 'MERCHANT_NO_RESPONSE', jsonb_build_object('source', 'timeout'));
            perform public.sync_master_order_status_from_suborders(v_sub.master_order_id, null);
            v_count := v_count + 1;
        exception when others then
            raise warning 'expire_unconfirmed_sub_orders failed for %: %', v_sub.id, sqlerrm;
        end;
    end loop;

    return v_count;
end;
$function$;

revoke all on function public.expire_unconfirmed_sub_orders() from public, anon, authenticated;
grant execute on function public.expire_unconfirmed_sub_orders() to service_role;

commit;
