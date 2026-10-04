-- WASSLHA
-- Rider live-location write path
-- Berrechid MVP

begin;

create index if not exists rider_locations_rider_recorded_at_idx
    on public.rider_locations (rider_id, recorded_at desc);

create index if not exists rider_locations_delivery_recorded_at_idx
    on public.rider_locations (delivery_id, recorded_at desc)
    where delivery_id is not null;

create policy rider_locations_insert_self_active
    on public.rider_locations
    for insert
    to authenticated
    with check (
        rider_id = auth.uid()
        and exists (
            select 1
            from public.riders r
            where r.id = auth.uid()
              and r.status = 'approved'
              and r.is_online = true
        )
        and (
            delivery_id is null
            or exists (
                select 1
                from public.delivery_assignments da
                where da.delivery_id = rider_locations.delivery_id
                  and da.rider_id = auth.uid()
                  and da.status = 'accepted'
            )
        )
    );

commit;
