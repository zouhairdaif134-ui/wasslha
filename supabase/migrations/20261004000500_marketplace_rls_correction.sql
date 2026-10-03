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

commit;
