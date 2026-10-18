-- WASSLHA
-- Catalog photos (chosen and uploaded by the admin), customer-app categories, and "most ordered" products.

alter table public.stores add column if not exists logo_url text;
alter table public.stores add column if not exists cover_url text;
alter table public.products add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do nothing;

drop policy if exists "catalog images admin insert" on storage.objects;
create policy "catalog images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog-images' and public.has_role('admin'));

drop policy if exists "catalog images admin update" on storage.objects;
create policy "catalog images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog-images' and public.has_role('admin'))
  with check (bucket_id = 'catalog-images' and public.has_role('admin'));

drop policy if exists "catalog images admin delete" on storage.objects;
create policy "catalog images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog-images' and public.has_role('admin'));

-- Categories aligned with the customer app (the 8th tile, Jib Liya, is a service).
update public.categories set name_ar = 'المحلات', name_fr = 'Commerces', slug = 'magasins', sort_order = 7 where slug = 'autres';
delete from public.categories c
 where c.slug = 'pharmacie'
   and not exists (select 1 from public.products p where p.category_id = c.id);
insert into public.categories (name_ar, name_fr, slug, sort_order) values
  ('اللحوم والدجاج', 'Viandes et volailles', 'viandes', 5),
  ('المشروبات', 'Boissons', 'boissons', 6)
on conflict (slug) do nothing;
update public.categories set name_ar = 'الخضر والفواكه', sort_order = 1 where slug = 'fruits-legumes';
update public.categories set name_ar = 'المطاعم', sort_order = 2 where slug = 'restaurants';
update public.categories set name_ar = 'البقالة', sort_order = 3 where slug = 'epicerie';
update public.categories set name_ar = 'المخابز والحلويات', sort_order = 4 where slug = 'boulangerie';

-- Most ordered products over the last 30 days (real orders only). Service role only.
create or replace function public.popular_product_ids(p_limit integer default 12)
returns table(product_id uuid, orders_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select oi.product_id, count(*)::bigint as orders_count
    from public.order_items oi
    join public.sub_orders so on so.id = oi.sub_order_id
   where so.status not in ('cancelled', 'failed')
     and so.created_at >= now() - interval '30 days'
   group by oi.product_id
   order by count(*) desc, oi.product_id
   limit least(greatest(coalesce(p_limit, 12), 1), 30);
$$;
revoke all on function public.popular_product_ids(integer) from public, anon, authenticated;
grant execute on function public.popular_product_ids(integer) to service_role;
