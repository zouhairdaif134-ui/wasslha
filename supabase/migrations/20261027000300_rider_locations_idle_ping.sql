-- WASSLHA
-- rider_locations: allow an online rider to report his position while idle
--
-- Dispatch (dispatch_auto_assign_pending) only offers orders to riders whose last position is < 2 minutes old,
-- but the insert policy required an accepted delivery for EVERY location row, so an idle online rider could never
-- report a position and could never be offered an order.
-- Change: a rider who is approved AND online may also insert his own position without a delivery (delivery_id IS NULL).
-- Rows tied to a delivery keep the exact previous rule.

begin;

alter policy rider_locations_insert_self_active on public.rider_locations
with check (
  rider_id = (select auth.uid())
  and exists (
    select 1 from public.riders r
     where r.id = (select auth.uid())
       and r.status = 'approved'
       and r.is_online = true
  )
  and (
    delivery_id is null
    or exists (
      select 1
        from public.delivery_assignments da
        join public.deliveries d on d.id = da.delivery_id
       where da.delivery_id = rider_locations.delivery_id
         and da.rider_id = (select auth.uid())
         and da.status = 'accepted'
         and d.status = any (array['assigned','accepted','at_pickup','picked_up','in_transit'])
    )
  )
);

commit;
