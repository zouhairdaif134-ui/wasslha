-- WASSLHA
-- Migration #73
-- Database Integrity
-- Berrechid MVP
--
-- Adds database-level integrity rules and performance indexes.
-- Does not implement business state machines.
-- Sensitive business logic remains backend controlled.

begin;

-- =========================================================
-- 1. ORDER INTEGRITY
-- =========================================================

create index if not exists sub_orders_master_order_status_idx
    on public.sub_orders (
        master_order_id,
        status
    );

create index if not exists order_items_sub_order_idx
    on public.order_items (
        sub_order_id
    );

create index if not exists order_status_history_order_idx
    on public.order_status_history (
        master_order_id,
        created_at asc
    );

create index if not exists cancellations_order_idx
    on public.cancellations (
        master_order_id,
        created_at desc
    );

create index if not exists substitutions_order_item_idx
    on public.substitutions (
        order_item_id,
        created_at desc
    );


-- =========================================================
-- 2. DELIVERY INTEGRITY
-- =========================================================

create index if not exists deliveries_master_order_status_idx
    on public.deliveries (
        master_order_id,
        status
    );

create index if not exists delivery_assignments_delivery_status_idx
    on public.delivery_assignments (
        delivery_id,
        status
    );

create index if not exists delivery_assignments_rider_status_idx
    on public.delivery_assignments (
        rider_id,
        status
    );

create index if not exists rider_locations_rider_created_idx
    on public.rider_locations (
        rider_id,
        created_at desc
    );

create index if not exists delivery_events_delivery_created_idx
    on public.delivery_events (
        delivery_id,
        created_at asc
    );


-- =========================================================
-- 3. RIDER INTEGRITY
-- =========================================================

create index if not exists rider_slots_rider_date_idx
    on public.rider_slots (
        rider_id,
        slot_date
    );

create index if not exists slot_waitlist_slot_position_idx
    on public.slot_waitlist (
        rider_slot_id,
        position
    );

create index if not exists slot_attendance_slot_rider_idx
    on public.slot_attendance (
        rider_slot_id,
        rider_id
    );

create index if not exists rider_performance_rider_period_idx
    on public.rider_performance (
        rider_id,
        period_start desc
    );

create index if not exists rider_bonuses_rider_created_idx
    on public.rider_bonuses (
        rider_id,
        created_at desc
    );


-- =========================================================
-- 4. FINANCE INTEGRITY
-- =========================================================

create index if not exists payments_order_status_idx
    on public.payments (
        master_order_id,
        status
    );

create index if not exists payment_transactions_payment_created_idx
    on public.payment_transactions (
        payment_id,
        created_at desc
    );

create index if not exists wallet_transactions_wallet_created_idx
    on public.wallet_transactions (
        wallet_id,
        created_at desc
    );

create index if not exists financial_ledger_order_created_idx
    on public.financial_ledger (
        master_order_id,
        created_at asc
    );

create index if not exists merchant_settlements_merchant_status_idx
    on public.merchant_settlements (
        merchant_id,
        status,
        created_at desc
    );

create index if not exists rider_earnings_rider_status_idx
    on public.rider_earnings (
        rider_id,
        status,
        created_at desc
    );

create index if not exists rider_withdrawals_rider_status_idx
    on public.rider_withdrawals (
        rider_id,
        status,
        created_at desc
    );

create index if not exists refunds_payment_status_idx
    on public.refunds (
        payment_id,
        status,
        created_at desc
    );


-- =========================================================
-- 5. COMMERCE INTEGRITY
-- =========================================================

create index if not exists stores_merchant_active_idx
    on public.stores (
        merchant_id,
        is_active
    );

create index if not exists products_store_active_idx
    on public.products (
        store_id,
        is_active
    );

create index if not exists product_variants_product_active_idx
    on public.product_variants (
        product_id,
        is_active
    );

create index if not exists product_images_product_idx
    on public.product_images (
        product_id,
        created_at asc
    );


-- =========================================================
-- 6. CUSTOMER ADDRESS INTEGRITY
-- =========================================================

create index if not exists addresses_user_default_idx
    on public.addresses (
        user_id,
        is_default
    );


-- =========================================================
-- 7. GROWTH INTEGRITY
-- =========================================================

create index if not exists promo_redemptions_user_order_idx
    on public.promo_redemptions (
        user_id,
        master_order_id
    );

create index if not exists referrals_status_idx
    on public.referrals (
        status,
        created_at asc
    );

create index if not exists loyalty_transactions_type_idx
    on public.loyalty_transactions (
        transaction_type,
        created_at desc
    );


-- =========================================================
-- 8. COMMUNICATION INTEGRITY
-- =========================================================

create index if not exists messages_unread_idx
    on public.messages (
        conversation_id,
        read_at,
        created_at asc
    );

create index if not exists notifications_unread_idx
    on public.notifications (
        user_id,
        status,
        created_at desc
    );


-- =========================================================
-- 9. SUPPORT INTEGRITY
-- =========================================================

create index if not exists complaints_open_idx
    on public.complaints (
        status,
        created_at asc
    );

create index if not exists reviews_published_merchant_idx
    on public.reviews (
        merchant_id,
        is_published,
        created_at desc
    );

create index if not exists reviews_published_rider_idx
    on public.reviews (
        rider_id,
        is_published,
        created_at desc
    );


-- =========================================================
-- 10. GET REQUEST INTEGRITY
-- =========================================================

create index if not exists get_requests_active_idx
    on public.get_requests (
        status,
        created_at asc
    );

create index if not exists get_request_items_request_created_idx
    on public.get_request_items (
        get_request_id,
        created_at asc
    );

create index if not exists get_request_offers_active_idx
    on public.get_request_offers (
        get_request_id,
        status,
        created_at desc
    );


-- =========================================================
-- 11. GOVERNANCE INTEGRITY
-- =========================================================

create index if not exists audit_logs_created_idx
    on public.audit_logs (
        created_at desc
    );

create index if not exists risk_flags_open_idx
    on public.risk_flags (
        status,
        severity,
        created_at asc
    );

create index if not exists setting_history_created_idx
    on public.setting_history (
        created_at desc
    );


-- =========================================================
-- 12. FINALIZE MIGRATION
-- =========================================================

commit;
