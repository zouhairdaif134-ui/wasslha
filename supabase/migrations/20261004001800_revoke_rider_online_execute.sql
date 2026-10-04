-- WASSLHA
-- Security hardening: rider online RPCs are server-only.
-- The API invokes these functions with service_role after authenticating
-- and authorizing the rider. Direct Data API execution is not permitted.

begin;

revoke execute on function public.rider_set_online(boolean) from anon, authenticated;
revoke execute on function public.rider_set_online(uuid, boolean) from anon, authenticated;

grant execute on function public.rider_set_online(boolean) to service_role;
grant execute on function public.rider_set_online(uuid, boolean) to service_role;

commit;
