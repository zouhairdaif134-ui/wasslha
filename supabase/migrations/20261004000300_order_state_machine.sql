-- WASSLHA
-- Migration #131
-- Atomic Order State Machine
-- Berrechid MVP
--
-- State transitions are validated and recorded atomically.
-- Financial changes are intentionally outside this function.

begin;

create or replace function public.transition_master_order_status(
    p_master_order_id uuid,
    p_new_status text,
    p_changed_by uuid default null,
    p_reason text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.master_orders%rowtype;
    v_allowed boolean := false;
begin
    select *
      into v_order
      from public.master_orders
     where id = p_master_order_id
     for update;

    if not found then
        raise exception 'MASTER_ORDER_NOT_FOUND';
    end if;

    if p_new_status = v_order.status then
        raise exception 'ORDER_STATUS_UNCHANGED';
    end if;

    v_allowed := case v_order.status
        when 'pending' then p_new_status in ('confirmed', 'cancelled')
        when 'confirmed' then p_new_status in ('preparing', 'cancelled')
        when 'preparing' then p_new_status in ('ready_for_pickup', 'cancelled')
        when 'ready_for_pickup' then p_new_status in ('assigned', 'cancelled')
        when 'assigned' then p_new_status in ('picked_up', 'cancelled')
        when 'picked_up' then p_new_status in ('out_for_delivery')
        when 'out_for_delivery' then p_new_status in ('delivered', 'cancelled')
        when 'delivered' then p_new_status in ('refunded')
        when 'cancelled' then p_new_status in ('refunded')
        when 'refunded' then false
        else false
    end;

    if not v_allowed then
        raise exception 'INVALID_MASTER_ORDER_TRANSITION:%:%',
            v_order.status,
            p_new_status;
    end if;

    update public.master_orders
       set status = p_new_status,
           confirmed_at = case
               when p_new_status = 'confirmed' then coalesce(confirmed_at, now())
               else confirmed_at
           end,
           delivered_at = case
               when p_new_status = 'delivered' then coalesce(delivered_at, now())
               else delivered_at
           end,
           cancelled_at = case
               when p_new_status = 'cancelled' then coalesce(cancelled_at, now())
               else cancelled_at
           end
     where id = p_master_order_id;

    insert into public.order_status_history (
        master_order_id,
        old_status,
        new_status,
        changed_by,
        reason,
        metadata
    )
    values (
        p_master_order_id,
        v_order.status,
        p_new_status,
        p_changed_by,
        p_reason,
        coalesce(p_metadata, '{}'::jsonb)
    );

    return jsonb_build_object(
        'id', p_master_order_id,
        'old_status', v_order.status,
        'new_status', p_new_status
    );
end;
$$;

create or replace function public.transition_sub_order_status(
    p_sub_order_id uuid,
    p_new_status text,
    p_changed_by uuid default null,
    p_reason text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.sub_orders%rowtype;
    v_allowed boolean := false;
begin
    select *
      into v_order
      from public.sub_orders
     where id = p_sub_order_id
     for update;

    if not found then
        raise exception 'SUB_ORDER_NOT_FOUND';
    end if;

    if p_new_status = v_order.status then
        raise exception 'ORDER_STATUS_UNCHANGED';
    end if;

    v_allowed := case v_order.status
        when 'pending' then p_new_status in ('confirmed', 'cancelled')
        when 'confirmed' then p_new_status in ('preparing', 'cancelled')
        when 'preparing' then p_new_status in ('ready_for_pickup', 'cancelled')
        when 'ready_for_pickup' then p_new_status in ('assigned', 'cancelled')
        when 'assigned' then p_new_status in ('picked_up', 'cancelled')
        when 'picked_up' then p_new_status in ('out_for_delivery')
        when 'out_for_delivery' then p_new_status in ('delivered', 'cancelled')
        when 'delivered' then false
        when 'cancelled' then false
        else false
    end;

    if not v_allowed then
        raise exception 'INVALID_SUB_ORDER_TRANSITION:%:%',
            v_order.status,
            p_new_status;
    end if;

    update public.sub_orders
       set status = p_new_status,
           confirmed_at = case
               when p_new_status = 'confirmed' then coalesce(confirmed_at, now())
               else confirmed_at
           end,
           ready_at = case
               when p_new_status = 'ready_for_pickup' then coalesce(ready_at, now())
               else ready_at
           end,
           delivered_at = case
               when p_new_status = 'delivered' then coalesce(delivered_at, now())
               else delivered_at
           end,
           cancelled_at = case
               when p_new_status = 'cancelled' then coalesce(cancelled_at, now())
               else cancelled_at
           end
     where id = p_sub_order_id;

    insert into public.order_status_history (
        master_order_id,
        sub_order_id,
        old_status,
        new_status,
        changed_by,
        reason,
        metadata
    )
    values (
        v_order.master_order_id,
        p_sub_order_id,
        v_order.status,
        p_new_status,
        p_changed_by,
        p_reason,
        coalesce(p_metadata, '{}'::jsonb)
    );

    return jsonb_build_object(
        'id', p_sub_order_id,
        'master_order_id', v_order.master_order_id,
        'old_status', v_order.status,
        'new_status', p_new_status
    );
end;
$$;

revoke all on function public.transition_master_order_status(uuid, text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.transition_sub_order_status(uuid, text, uuid, text, jsonb) from public, anon, authenticated;

grant execute on function public.transition_master_order_status(uuid, text, uuid, text, jsonb) to service_role;
grant execute on function public.transition_sub_order_status(uuid, text, uuid, text, jsonb) to service_role;

comment on function public.transition_master_order_status(uuid, text, uuid, text, jsonb) is
    'Atomically validates and records a master-order status transition. Service-role only.';

comment on function public.transition_sub_order_status(uuid, text, uuid, text, jsonb) is
    'Atomically validates and records a sub-order status transition. Service-role only.';

commit;
