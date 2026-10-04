-- WASSLHA
-- Optimize auth function evaluation inside RLS policies.

begin;

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
        position('auth.uid()' in coalesce(qual,'')) > 0
        or position('auth.uid()' in coalesce(with_check,'')) > 0
        or position('auth.jwt()' in coalesce(qual,'')) > 0
        or position('auth.jwt()' in coalesce(with_check,'')) > 0
      )
  loop
    q := p.qual;
    w := p.with_check;
    if q is not null then
      q := replace(q,'auth.uid()','(select auth.uid())');
      q := replace(q,'auth.jwt()','(select auth.jwt())');
      execute format('alter policy %I on public.%I using (%s)',p.policyname,p.tablename,q);
    end if;
    if w is not null then
      w := replace(w,'auth.uid()','(select auth.uid())');
      w := replace(w,'auth.jwt()','(select auth.jwt())');
      execute format('alter policy %I on public.%I with check (%s)',p.policyname,p.tablename,w);
    end if;
  end loop;
end $$;

commit;
