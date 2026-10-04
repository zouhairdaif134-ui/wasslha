-- WASSLHA
-- Move the RLS role helper out of the exposed public API schema.

begin;

create schema if not exists private;

create or replace function private.has_role(requested_role text)
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

revoke all on function private.has_role(text) from public;
revoke all on function private.has_role(text) from anon;
revoke all on function private.has_role(text) from authenticated;
grant execute on function private.has_role(text) to authenticated;

do $$
declare
  p record;
  q text;
  w text;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname='public'
      and (
        position('public.has_role(' in coalesce(qual,'')) > 0
        or position('public.has_role(' in coalesce(with_check,'')) > 0
      )
  loop
    q := p.qual;
    w := p.with_check;
    if q is not null then
      q := replace(q,'public.has_role(','private.has_role(');
      execute format('alter policy %I on public.%I using (%s)',p.policyname,p.tablename,q);
    end if;
    if w is not null then
      w := replace(w,'public.has_role(','private.has_role(');
      execute format('alter policy %I on public.%I with check (%s)',p.policyname,p.tablename,w);
    end if;
  end loop;
end $$;

revoke all on function public.has_role(text) from public;
revoke all on function public.has_role(text) from anon;
revoke all on function public.has_role(text) from authenticated;

commit;
