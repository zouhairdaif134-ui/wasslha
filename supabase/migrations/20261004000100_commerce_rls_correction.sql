-- WASSLHA
-- Database correction migration
-- Source of truth: WASSLHA Master Product & Technical Specification v1.0
-- Corrects the Commerce RLS predicate for product updates.

begin;

drop policy if exists products_update_owner_admin
    on public.products;

create policy products_update_owner_admin
on public.products
for update
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.stores s
        join public.merchants m
            on m.id = s.merchant_id
        where s.id = products.store_id
          and m.user_id = auth.uid()
    )
)
with check (
    public.has_role('admin')
    or exists (
        select 1
        from public.stores s
        join public.merchants m
            on m.id = s.merchant_id
        where s.id = products.store_id
          and m.user_id = auth.uid()
    )
);

commit;
