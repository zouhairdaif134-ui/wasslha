-- WASSLHA
-- Migration #132
-- Foreign-key performance indexes
-- Adds covering indexes for FK columns identified by Supabase advisor.

begin;
create index if not exists admin_settings_updated_by_idx on public.admin_settings (updated_by);
create index if not exists cancellations_cancelled_by_idx on public.cancellations (cancelled_by);
create index if not exists complaints_resolved_by_idx on public.complaints (resolved_by);
create index if not exists delivery_assignments_assigned_by_idx on public.delivery_assignments (assigned_by);
create index if not exists delivery_events_rider_id_idx on public.delivery_events (rider_id);
create index if not exists financial_ledger_payment_id_idx on public.financial_ledger (payment_id);
create index if not exists get_request_status_history_changed_by_idx on public.get_request_status_history (changed_by);
create index if not exists get_requests_address_id_idx on public.get_requests (address_id);
create index if not exists master_orders_delivery_address_id_idx on public.master_orders (delivery_address_id);
create index if not exists merchants_approved_by_idx on public.merchants (approved_by);
create index if not exists order_status_history_changed_by_idx on public.order_status_history (changed_by);
create index if not exists promo_redemptions_promo_code_id_idx on public.promo_redemptions (promo_code_id);
create index if not exists promotions_created_by_idx on public.promotions (created_by);
create index if not exists referrals_qualified_order_id_idx on public.referrals (qualified_order_id);
create index if not exists refunds_approved_by_idx on public.refunds (approved_by);
create index if not exists refunds_requested_by_idx on public.refunds (requested_by);
create index if not exists review_replies_user_id_idx on public.review_replies (user_id);
create index if not exists rider_bonuses_approved_by_idx on public.rider_bonuses (approved_by);
create index if not exists rider_violations_reported_by_idx on public.rider_violations (reported_by);
create index if not exists rider_violations_resolved_by_idx on public.rider_violations (resolved_by);
create index if not exists rider_withdrawals_processed_by_idx on public.rider_withdrawals (processed_by);
create index if not exists riders_approved_by_idx on public.riders (approved_by);
create index if not exists risk_flags_created_by_idx on public.risk_flags (created_by);
create index if not exists risk_flags_resolved_by_idx on public.risk_flags (resolved_by);
create index if not exists setting_history_changed_by_idx on public.setting_history (changed_by);
create index if not exists substitutions_original_product_id_idx on public.substitutions (original_product_id);
create index if not exists substitutions_proposed_by_idx on public.substitutions (proposed_by);
create index if not exists user_roles_assigned_by_idx on public.user_roles (assigned_by);
commit;
