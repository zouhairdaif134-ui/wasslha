-- WASSLHA
-- Marketplace RLS correction
-- Allows public marketplace discovery of approved merchants.

begin;

drop policy if exists merchants_select_public_approved
    on public.merchants;

create policy merchants_select_public_approved
on public.merchants
for select
to anon, authenticated
using (
    status = 'approved'
);

drop policy if exists promotions_select_public_active
    on public.promotions;

create policy promotions_select_public_active
on public.promotions
for select
to anon, authenticated
using (
    is_active = true
    and now() >= starts_at
    and now() <= ends_at
);

drop policy if exists reviews_select_public_published
    on public.reviews;

create policy reviews_select_public_published
on public.reviews
for select
to anon, authenticated
using (
    is_published = true
);

commit;
