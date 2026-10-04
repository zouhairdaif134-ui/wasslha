-- WASSLHA
-- One customer review per completed order.

begin;
create unique index if not exists reviews_user_order_unique_idx on public.reviews(user_id, master_order_id);
commit;
