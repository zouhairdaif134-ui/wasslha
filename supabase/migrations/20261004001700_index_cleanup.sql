-- WASSLHA
-- Migration #133
-- Index deduplication and remaining FK indexes

begin;
create index if not exists substitutions_replacement_product_id_idx on public.substitutions (replacement_product_id);
create index if not exists user_roles_role_id_idx on public.user_roles (role_id);
drop index if exists complaints_status_idx;
drop index if exists financial_ledger_order_created_idx;
drop index if exists get_request_items_request_idx;
drop index if exists get_requests_status_idx;
drop index if exists order_items_sub_order_idx;
drop index if exists order_status_history_order_idx;
drop index if exists rider_performance_rider_period_idx;
drop index if exists risk_flags_status_idx;
drop index if exists slot_waitlist_slot_position_idx;
drop index if exists wallet_transactions_wallet_idx;
commit;
