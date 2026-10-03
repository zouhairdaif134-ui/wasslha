-- WASSLHA
-- Delivery RLS correction
-- Riders must be able to read completed delivery history.

begin;

drop policy if exists deliveries_select_customer_rider_admin
    on public.deliveries;

create policy deliveries_select_customer_rider_admin
on public.deliveries
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.master_orders mo
        where mo.id = deliveries.master_order_id
          and mo.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.delivery_assignments da
        where da.delivery_id = deliveries.id
          and da.rider_id = auth.uid()
          and da.status in ('offered', 'accepted', 'completed')
    )
);

commit;
