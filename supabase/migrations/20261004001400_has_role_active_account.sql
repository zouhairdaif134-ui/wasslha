-- WASSLHA
-- Security: role checks must reject inactive accounts.
-- Master Spec requirement: RBAC + RLS + account security.

begin;

create or replace function public.has_role(requested_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.users u on u.id = ur.user_id
    where ur.user_id = auth.uid()
      and u.is_active = true
      and r.code = requested_role
  );
$$;

revoke all on function public.has_role(text) from public;
revoke all on function public.has_role(text) from anon;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_role(text) to service_role;

commit;
