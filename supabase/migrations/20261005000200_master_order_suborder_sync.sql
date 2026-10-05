-- WASSLHA
-- Master order synchronization from merchant sub-orders
-- Keeps the delivery state machine coherent for multi-merchant orders.

begin;

create or replace function public.sync_master_order_status_from_suborders(
    p_master_order_id uuid,
    p_changed_by uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_master public.master_orders%rowtype;
    v_target text;
    v_current_rank integer;
    v_target_rank integer;
begin
    select * into v_master from public.master_orders where id=p_master_order_id for update;
    if not found then raise exception 'MASTER_ORDER_NOT_FOUND'; end if;

    if v_master.status in ('assigned','picked_up','out_for_delivery','delivered','cancelled','refunded') then
        return jsonb_build_object('status',v_master.status,'changed',false);
    end if;

    if not exists (select 1 from public.sub_orders where master_order_id=p_master_order_id and status<>'cancelled') then
        if v_master.status<>'cancelled' then
            perform public.transition_master_order_status(p_master_order_id,'cancelled',p_changed_by,'All merchant sub-orders cancelled');
            return jsonb_build_object('status','cancelled','changed',true);
        end if;
        return jsonb_build_object('status',v_master.status,'changed',false);
    end if;

    if not exists (select 1 from public.sub_orders where master_order_id=p_master_order_id and status<>'cancelled' and status in ('confirmed','preparing','ready_for_pickup','assigned','picked_up','out_for_delivery','delivered')) then
        v_target:='pending';
    elsif not exists (select 1 from public.sub_orders where master_order_id=p_master_order_id and status<>'cancelled' and status in ('preparing','ready_for_pickup','assigned','picked_up','out_for_delivery','delivered')) then
        v_target:='confirmed';
    elsif not exists (select 1 from public.sub_orders where master_order_id=p_master_order_id and status<>'cancelled' and status in ('ready_for_pickup','assigned','picked_up','out_for_delivery','delivered')) then
        v_target:='preparing';
    else
        v_target:='ready_for_pickup';
    end if;

    v_current_rank:=case v_master.status when 'pending' then 0 when 'confirmed' then 1 when 'preparing' then 2 when 'ready_for_pickup' then 3 else 99 end;
    v_target_rank:=case v_target when 'pending' then 0 when 'confirmed' then 1 when 'preparing' then 2 when 'ready_for_pickup' then 3 else 99 end;

    if v_target_rank>v_current_rank then
        perform public.transition_master_order_status(
            p_master_order_id,
            case v_current_rank when 0 then 'confirmed' when 1 then 'preparing' when 2 then 'ready_for_pickup' else v_master.status end,
            p_changed_by,
            'Synchronized from merchant sub-orders'
        );
        return public.sync_master_order_status_from_suborders(p_master_order_id,p_changed_by);
    end if;

    return jsonb_build_object('status',v_master.status,'target_status',v_target,'changed',false);
end;
$$;

revoke all on function public.sync_master_order_status_from_suborders(uuid,uuid) from public,anon,authenticated;
grant execute on function public.sync_master_order_status_from_suborders(uuid,uuid) to service_role;

commit;