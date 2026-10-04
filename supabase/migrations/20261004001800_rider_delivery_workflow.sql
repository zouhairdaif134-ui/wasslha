-- WASSLHA
-- Rider delivery workflow hardening
-- Source of truth: WASSLHA Master Product & Technical Specification v1.0
--
-- Rider online state and delivery lifecycle are server-authoritative.
-- Client-side state never bypasses the delivery/order state machine.

begin;

create or replace function public.rider_set_online(
    p_rider_id uuid,
    p_is_online boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_rider public.riders%rowtype;
begin
    select * into v_rider from public.riders where id = p_rider_id for update;
    if not found then raise exception 'RIDER_NOT_FOUND'; end if;
    if v_rider.status <> 'approved' and p_is_online then raise exception 'RIDER_NOT_APPROVED'; end if;
    update public.riders set is_online = p_is_online, updated_at = now() where id = p_rider_id;
    return jsonb_build_object('id', p_rider_id, 'is_online', p_is_online, 'status', v_rider.status);
end;
$$;

create or replace function public.rider_transition_delivery_status(
    p_delivery_id uuid,
    p_rider_id uuid,
    p_new_status text,
    p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_delivery public.deliveries%rowtype;
    v_assignment public.delivery_assignments%rowtype;
    v_master public.master_orders%rowtype;
    v_all boolean;
begin
    if p_new_status not in ('at_pickup','picked_up','in_transit','delivered','failed','cancelled') then
        raise exception 'INVALID_DELIVERY_STATUS';
    end if;

    select * into v_assignment from public.delivery_assignments
     where delivery_id = p_delivery_id and rider_id = p_rider_id and status = 'accepted'
     order by responded_at desc nulls last, created_at desc limit 1;
    if not found then raise exception 'DELIVERY_NOT_ASSIGNED_TO_RIDER'; end if;

    select * into v_delivery from public.deliveries where id = p_delivery_id for update;
    if not found then raise exception 'DELIVERY_NOT_FOUND'; end if;

    if p_new_status = v_delivery.status then raise exception 'DELIVERY_STATUS_UNCHANGED'; end if;
    if p_new_status = 'at_pickup' and v_delivery.status <> 'accepted' then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;
    if p_new_status = 'picked_up' and v_delivery.status not in ('accepted','at_pickup') then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;
    if p_new_status = 'in_transit' and v_delivery.status <> 'picked_up' then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;
    if p_new_status = 'delivered' and v_delivery.status <> 'in_transit' then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;
    if p_new_status in ('failed','cancelled') and v_delivery.status in ('delivered','cancelled') then raise exception 'INVALID_DELIVERY_TRANSITION'; end if;

    update public.deliveries
       set status = p_new_status,
           started_at = case when p_new_status = 'at_pickup' then coalesce(started_at, now()) else started_at end,
           picked_up_at = case when p_new_status = 'picked_up' then coalesce(picked_up_at, now()) else picked_up_at end,
           delivered_at = case when p_new_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
           cancelled_at = case when p_new_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
           updated_at = now()
     where id = p_delivery_id;

    insert into public.delivery_events(delivery_id,rider_id,event_type,metadata)
    values (
      p_delivery_id,p_rider_id,
      case p_new_status
        when 'at_pickup' then 'arrived_pickup'
        when 'picked_up' then 'pickup_confirmed'
        when 'in_transit' then 'departed_pickup'
        when 'delivered' then 'delivery_confirmed'
        when 'failed' then 'delivery_failed'
        when 'cancelled' then 'delivery_failed'
      end,
      jsonb_build_object('reason',p_reason)
    );

    select * into v_master from public.master_orders where id = v_delivery.master_order_id for update;

    if p_new_status = 'picked_up' then
      select not exists(select 1 from public.deliveries d where d.master_order_id=v_delivery.master_order_id and d.status not in ('picked_up','in_transit','delivered')) into v_all;
      if v_all and v_master.status='assigned' then perform public.transition_master_order_status(v_master.id,'picked_up',p_rider_id,'All deliveries picked up'); end if;
    elsif p_new_status = 'in_transit' then
      select not exists(select 1 from public.deliveries d where d.master_order_id=v_delivery.master_order_id and d.status not in ('in_transit','delivered')) into v_all;
      if v_all and v_master.status='picked_up' then perform public.transition_master_order_status(v_master.id,'out_for_delivery',p_rider_id,'All deliveries in transit'); end if;
    elsif p_new_status = 'delivered' then
      select not exists(select 1 from public.deliveries d where d.master_order_id=v_delivery.master_order_id and d.status <> 'delivered') into v_all;
      if v_all and v_master.status='out_for_delivery' then perform public.transition_master_order_status(v_master.id,'delivered',p_rider_id,'All deliveries delivered'); end if;
    end if;

    return jsonb_build_object('delivery_id',p_delivery_id,'status',p_new_status,'master_order_id',v_delivery.master_order_id);
end;
$$;

revoke all on function public.rider_set_online(uuid,boolean) from public,anon,authenticated;
revoke all on function public.rider_transition_delivery_status(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.rider_set_online(uuid,boolean) to service_role;
grant execute on function public.rider_transition_delivery_status(uuid,uuid,text,text) to service_role;

commit;
