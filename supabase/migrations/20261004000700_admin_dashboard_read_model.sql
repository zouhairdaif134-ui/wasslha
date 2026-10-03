-- WASSLHA
-- Admin Dashboard read model
-- Berrechid MVP
--
-- Read-only operational/financial summary for the Admin Dashboard.
-- Authorization is enforced by the API before the service-role RPC is called.

begin;

create or replace function public.admin_dashboard_overview(p_admin_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_day_start timestamptz;
    v_day_end timestamptz;
    v_result jsonb;
begin
    if not public.has_role(p_admin_user_id, 'admin') then
        raise exception 'ADMIN_REQUIRED';
    end if;

    v_day_start := (
        (timezone('Africa/Casablanca', now())::date::text || ' 00:00:00 Africa/Casablanca')
    )::timestamptz;
    v_day_end := v_day_start + interval '1 day';

    select jsonb_build_object(
        'generated_at', now(),
        'currency', 'MAD',
        'scope', 'Berrechid MVP',
        'today', jsonb_build_object(
            'orders', (
                select count(*)
                from public.master_orders
                where created_at >= v_day_start
                  and created_at < v_day_end
            ),
            'gmv_minor', coalesce((
                select sum(total_minor)
                from public.master_orders
                where created_at >= v_day_start
                  and created_at < v_day_end
                  and status not in ('cancelled', 'refunded')
            ), 0),
            'delivered_orders', (
                select count(*)
                from public.master_orders
                where delivered_at >= v_day_start
                  and delivered_at < v_day_end
            ),
            'refunds_minor', coalesce((
                select sum(amount_minor)
                from public.refunds
                where created_at >= v_day_start
                  and created_at < v_day_end
            ), 0)
        ),
        'operations', jsonb_build_object(
            'active_orders', (
                select count(*)
                from public.master_orders
                where status in (
                    'pending',
                    'confirmed',
                    'preparing',
                    'ready_for_pickup',
                    'assigned',
                    'picked_up',
                    'out_for_delivery'
                )
            ),
            'active_deliveries', (
                select count(*)
                from public.deliveries
                where status in ('pending', 'assigned', 'accepted', 'at_pickup', 'picked_up', 'in_transit')
            ),
            'failed_deliveries_today', (
                select count(*)
                from public.deliveries
                where status = 'failed'
                  and updated_at >= v_day_start
                  and updated_at < v_day_end
            ),
            'approved_riders', (
                select count(*)
                from public.riders
                where status = 'approved'
            ),
            'online_riders', (
                select count(*)
                from public.riders
                where status = 'approved'
                  and is_online = true
            ),
            'approved_merchants', (
                select count(*)
                from public.merchants
                where status = 'approved'
            ),
            'pending_merchants', (
                select count(*)
                from public.merchants
                where status = 'pending'
            )
        ),
        'finance', jsonb_build_object(
            'commission_minor_today', coalesce((
                select sum(amount_minor)
                from public.financial_ledger
                where entry_type = 'commission'
                  and direction = 'credit'
                  and created_at >= v_day_start
                  and created_at < v_day_end
            ), 0),
            'delivery_fees_minor_today', coalesce((
                select sum(amount_minor)
                from public.financial_ledger
                where entry_type = 'delivery_fee'
                  and direction = 'credit'
                  and created_at >= v_day_start
                  and created_at < v_day_end
            ), 0),
            'rider_earnings_minor_today', coalesce((
                select sum(amount_minor)
                from public.financial_ledger
                where entry_type = 'rider_earning'
                  and direction = 'debit'
                  and created_at >= v_day_start
                  and created_at < v_day_end
            ), 0),
            'ledger_entries_today', (
                select count(*)
                from public.financial_ledger
                where created_at >= v_day_start
                  and created_at < v_day_end
            )
        ),
        'users', jsonb_build_object(
            'total', (select count(*) from public.users),
            'new_today', (
                select count(*)
                from public.users
                where created_at >= v_day_start
                  and created_at < v_day_end
            )
        )
    )
    into v_result;

    return v_result;
end;
$$;

revoke all on function public.admin_dashboard_overview(uuid) from public, anon, authenticated;
grant execute on function public.admin_dashboard_overview(uuid) to service_role;

comment on function public.admin_dashboard_overview(uuid) is
    'Read-only Admin Dashboard overview for the Berrechid MVP. Admin authorization required.';

commit;
