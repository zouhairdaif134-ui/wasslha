-- WASSLHA
-- Create the delivery together with the order
--
-- Nothing created the `deliveries` row, so dispatch (which only offers existing deliveries with status 'pending'
-- whose master order is 'ready_for_pickup') could never offer an order to a rider.
-- Pattern used by delivery platforms (a delivery/parcel is created with the order and activated later):
-- the delivery is created as 'pending' when the first sub-order is inserted; dispatch ignores it until the order is
-- ready_for_pickup. deliveries has a unique index on master_order_id => one delivery per order,
-- pickup point = first store of the order.

begin;

create or replace function public.create_delivery_for_new_sub_order()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    v_master public.master_orders%rowtype;
    v_store public.stores%rowtype;
    v_addr public.addresses%rowtype;
begin
    select * into v_master from public.master_orders where id = new.master_order_id;
    if not found then return new; end if;

    if exists (select 1 from public.deliveries d where d.master_order_id = new.master_order_id) then
        return new;
    end if;

    select * into v_store from public.stores where id = new.store_id;
    select * into v_addr from public.addresses where id = v_master.delivery_address_id;
    if v_addr.id is null then return new; end if;

    insert into public.deliveries (
        master_order_id, pickup_address_text, pickup_latitude, pickup_longitude,
        delivery_address_text, delivery_latitude, delivery_longitude, status, customer_note
    ) values (
        new.master_order_id, v_store.address_text, v_store.latitude, v_store.longitude,
        v_addr.address_text, v_addr.latitude, v_addr.longitude, 'pending', v_master.customer_note
    )
    on conflict (master_order_id) do nothing;

    return new;
end;
$function$;

revoke all on function public.create_delivery_for_new_sub_order() from public, anon, authenticated;

drop trigger if exists trg_create_delivery_on_sub_order on public.sub_orders;
create trigger trg_create_delivery_on_sub_order
  after insert on public.sub_orders
  for each row execute function public.create_delivery_for_new_sub_order();

-- Backfill: open orders created before this trigger existed.
insert into public.deliveries (
    master_order_id, pickup_address_text, pickup_latitude, pickup_longitude,
    delivery_address_text, delivery_latitude, delivery_longitude, status, customer_note
)
select x.master_order_id, s.address_text, s.latitude, s.longitude,
       a.address_text, a.latitude, a.longitude, 'pending', mo.customer_note
  from (
        select distinct on (so.master_order_id) so.master_order_id, so.store_id
          from public.sub_orders so
         order by so.master_order_id, so.created_at
       ) x
  join public.master_orders mo on mo.id = x.master_order_id
  join public.stores s on s.id = x.store_id
  join public.addresses a on a.id = mo.delivery_address_id
 where mo.status not in ('cancelled', 'delivered', 'refunded')
   and not exists (select 1 from public.deliveries d where d.master_order_id = x.master_order_id)
on conflict (master_order_id) do nothing;

commit;
