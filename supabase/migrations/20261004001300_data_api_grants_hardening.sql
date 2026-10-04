-- WASSLHA
-- Data API grants hardening
-- Berrechid MVP
-- Source of truth: WASSLHA Master Product & Technical Specification v1.0
--
-- Supabase Data API exposure is separate from RLS.
-- Anonymous access is intentionally limited to the public marketplace read surface.
-- Authenticated write access remains controlled by RLS policies and backend authorization.

begin;

-- Remove broad anonymous table privileges first. RLS is still required, but
-- anonymous roles should not have unnecessary table-level capabilities.
do $$
declare
    item record;
begin
    for item in
        select tablename
        from pg_tables
        where schemaname = 'public'
    loop
        execute format(
            'revoke all privileges on table public.%I from anon',
            item.tablename
        );
    end loop;
end
$$;

-- Keep the anonymous role limited to the public marketplace read surface.
grant select on table
    public.categories,
    public.merchants,
    public.stores,
    public.products,
    public.product_variants,
    public.product_images,
    public.promotions,
    public.reviews
    to anon;

-- Explicit schema usage for Data API access.
grant usage on schema public to anon, authenticated;

commit;
