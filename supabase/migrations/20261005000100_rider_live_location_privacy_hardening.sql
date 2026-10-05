begin;

drop policy if exists rider_locations_insert_self_active on public.rider_locations;

create policy rider_locations_insert_self_active
on public.rider_locations
for insert
to authenticated
with check (
  rider_id = (select auth.uid())
  and exists (
    select 1
    from public.riders r
    where r.id = (select auth.uid())
      and r.status = 'approved'
      and r.is_online = true
  )
  and delivery_id is not null
  and exists (
    select 1
    from public.delivery_assignments da
    join public.deliveries d on d.id = da.delivery_id
    where da.delivery_id = rider_locations.delivery_id
      and da.rider_id = (select auth.uid())
      and da.status = 'accepted'
      and d.status in ('assigned','accepted','at_pickup','picked_up','in_transit')
  )
);

commit;
