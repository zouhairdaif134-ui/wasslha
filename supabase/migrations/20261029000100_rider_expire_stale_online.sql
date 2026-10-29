-- WASSLHA
-- rider_expire_stale_online: end the online session when a rider stops reporting his position
--
-- A rider who closes the app (or loses the phone/connection) stayed "online" forever, so dispatch kept offering him
-- orders nobody could answer. Marketplace behaviour: a session ends when the rider stops reporting a position.
-- Riders with an accepted (in-progress) delivery are never touched. Called every minute by the API cron
-- (apps/api/src/services/dispatch-job-service.ts).

begin;

create or replace function public.rider_expire_stale_online(p_stale_minutes integer default 10)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    v_count integer;
begin
    with stale as (
        select r.id
          from public.riders r
         where r.is_online
           and coalesce(
                 (select max(l.recorded_at) from public.rider_locations l where l.rider_id = r.id),
                 r.updated_at
               ) < now() - make_interval(mins => greatest(p_stale_minutes, 1))
           and not exists (
                 select 1 from public.delivery_assignments da
                  where da.rider_id = r.id and da.status = 'accepted'
               )
    ), updated as (
        update public.riders r
           set is_online = false,
               updated_at = now()
          from stale s
         where r.id = s.id
        returning r.id
    )
    select count(*) into v_count from updated;

    return v_count;
end;
$function$;

revoke all on function public.rider_expire_stale_online(integer) from public, anon, authenticated;
grant execute on function public.rider_expire_stale_online(integer) to service_role;

commit;
