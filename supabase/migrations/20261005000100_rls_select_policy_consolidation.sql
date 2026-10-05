begin;

-- Consolidate permissive SELECT policies so each role/action has one policy.

-- Categories
 drop policy if exists categories_admin_manage on public.categories;
 drop policy if exists categories_select_active on public.categories;
 create policy categories_select_active on public.categories for select to anon, authenticated using (is_active = true or has_role('admin'));
 create policy categories_admin_insert on public.categories for insert to authenticated with check (has_role('admin'));
 create policy categories_admin_update on public.categories for update to authenticated using (has_role('admin')) with check (has_role('admin'));
 create policy categories_admin_delete on public.categories for delete to authenticated using (has_role('admin'));

-- Merchants
 drop policy if exists merchants_select_own on public.merchants;
 drop policy if exists merchants_select_public_approved on public.merchants;
 create policy merchants_select_visible on public.merchants for select to anon, authenticated using (status = 'approved' or user_id = (select auth.uid()) or has_role('admin'));

-- Product images
 drop policy if exists product_images_manage_owner_admin on public.product_images;
 drop policy if exists product_images_select_public on public.product_images;
 create policy product_images_select_visible on public.product_images for select to anon, authenticated using (
   (is_active = true and exists (
     select 1 from products p join stores s on s.id = p.store_id join merchants m on m.id = s.merchant_id
     where p.id = product_images.product_id and p.is_active = true and p.approval_status = 'approved' and s.is_active = true and m.status = 'approved'
   ))
   or has_role('admin')
   or exists (
     select 1 from products p join stores s on s.id = p.store_id join merchants m on m.id = s.merchant_id
     where p.id = product_images.product_id and m.user_id = (select auth.uid())
   )
 );
 create policy product_images_insert_owner_admin on public.product_images for insert to authenticated with check (has_role('admin') or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_images.product_id and m.user_id=(select auth.uid())));
 create policy product_images_update_owner_admin on public.product_images for update to authenticated using (has_role('admin') or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_images.product_id and m.user_id=(select auth.uid()))) with check (has_role('admin') or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_images.product_id and m.user_id=(select auth.uid())));
 create policy product_images_delete_owner_admin on public.product_images for delete to authenticated using (has_role('admin') or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_images.product_id and m.user_id=(select auth.uid())));

-- Product variants
 drop policy if exists product_variants_manage_owner_admin on public.product_variants;
 drop policy if exists product_variants_select_public on public.product_variants;
 create policy product_variants_select_visible on public.product_variants for select to anon, authenticated using (
   (is_active = true and is_available = true and exists (
     select 1 from products p join stores s on s.id = p.store_id join merchants m on m.id = s.merchant_id
     where p.id = product_variants.product_id and p.is_active = true and p.is_available = true and p.approval_status = 'approved' and s.is_active = true and m.status = 'approved'
   ))
   or has_role('admin')
   or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_variants.product_id and m.user_id=(select auth.uid()))
 );
 create policy product_variants_insert_owner_admin on public.product_variants for insert to authenticated with check (has_role('admin') or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_variants.product_id and m.user_id=(select auth.uid())));
 create policy product_variants_update_owner_admin on public.product_variants for update to authenticated using (has_role('admin') or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_variants.product_id and m.user_id=(select auth.uid()))) with check (has_role('admin') or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_variants.product_id and m.user_id=(select auth.uid())));
 create policy product_variants_delete_owner_admin on public.product_variants for delete to authenticated using (has_role('admin') or exists (select 1 from products p join stores s on s.id=p.store_id join merchants m on m.id=s.merchant_id where p.id=product_variants.product_id and m.user_id=(select auth.uid())));

-- Products
 drop policy if exists products_select_owner_admin on public.products;
 drop policy if exists products_select_public on public.products;
 create policy products_select_visible on public.products for select to anon, authenticated using (
   ((is_active = true and is_available = true and approval_status = 'approved') and exists (select 1 from stores s join merchants m on m.id=s.merchant_id where s.id=products.store_id and s.is_active=true and m.status='approved'))
   or has_role('admin')
   or exists (select 1 from stores s join merchants m on m.id=s.merchant_id where s.id=products.store_id and m.user_id=(select auth.uid()))
 );

-- Promotions
 drop policy if exists promotions_select_active_authenticated on public.promotions;
 drop policy if exists promotions_select_public_active on public.promotions;
 create policy promotions_select_visible on public.promotions for select to anon, authenticated using ((is_active = true and now() >= starts_at and now() <= ends_at) or has_role('admin'));

-- Reviews
 drop policy if exists reviews_select_public_published on public.reviews;
 drop policy if exists reviews_select_published_authenticated on public.reviews;
 create policy reviews_select_visible on public.reviews for select to anon, authenticated using (is_published = true or user_id = (select auth.uid()) or has_role('admin'));

-- Rider slots
 drop policy if exists rider_slots_admin_manage on public.rider_slots;
 drop policy if exists rider_slots_select_authenticated on public.rider_slots;
 create policy rider_slots_select_visible on public.rider_slots for select to authenticated using (status <> 'cancelled' or has_role('admin'));
 create policy rider_slots_admin_insert on public.rider_slots for insert to authenticated with check (has_role('admin'));
 create policy rider_slots_admin_update on public.rider_slots for update to authenticated using (has_role('admin')) with check (has_role('admin'));
 create policy rider_slots_admin_delete on public.rider_slots for delete to authenticated using (has_role('admin'));

-- Stores
 drop policy if exists stores_select_owner_admin on public.stores;
 drop policy if exists stores_select_public on public.stores;
 create policy stores_select_visible on public.stores for select to anon, authenticated using (
   ((is_active = true) and exists (select 1 from merchants m where m.id=stores.merchant_id and m.status='approved' and m.user_id is not null))
   or has_role('admin')
   or exists (select 1 from merchants m where m.id=stores.merchant_id and m.user_id=(select auth.uid()))
 );

commit;
