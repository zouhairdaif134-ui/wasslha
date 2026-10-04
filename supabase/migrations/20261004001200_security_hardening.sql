-- WASSLHA
-- Security hardening
-- Berrechid MVP
-- Source of truth: WASSLHA Master Product & Technical Specification v1.0

begin;

-- Trigger-only SECURITY DEFINER functions must not be callable through PostgREST.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.assign_default_customer_role() from public, anon, authenticated;

-- has_role() is intentionally callable by authenticated sessions because it is
-- used by RLS policies; anonymous callers do not need it.
revoke execute on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated, service_role;

commit;
