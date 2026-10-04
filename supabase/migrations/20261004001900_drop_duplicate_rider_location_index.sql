-- WASSLHA
-- Performance cleanup: remove duplicate rider location index.

begin;
drop index if exists public.rider_locations_rider_recorded_idx;
commit;
