-- WASSLHA
-- Dispatch location index cleanup
-- Berrechid MVP

begin;

drop index if exists public.rider_locations_delivery_recorded_idx;
drop index if exists public.rider_locations_rider_recorded_idx;

commit;
