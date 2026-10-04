-- WASSLHA
-- GPS privacy correction: customers only see rider location after pickup.

begin;

drop policy if exists rider_locations_select_authorized on public.rider_locations;

create policy rider_locations_select_authorized
on public.rider_locations
for select
to authenticated
using (
  public.has_role('admin')
  or rider_id = auth.uid()
  or exists (
    select 1
    from public.deliveries d
    join public.master_orders mo on mo.id = d.master_order_id
    where d.id = rider_locations.delivery_id
      and mo.customer_id = auth.uid()
      and d.status in ('picked_up','in_transit','delivered')
  )
);

commit;
