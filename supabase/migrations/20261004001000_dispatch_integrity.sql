-- WASSLHA
-- Dispatch integration integrity
-- Berrechid MVP
--
-- Atomic dispatch operations prevent partial assignment state.

begin;

create or replace function public.dispatch_offer_delivery(
    p_delivery_id uuid,
    p_rider_id uuid,
    p_assigned_by uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_delivery public.deliveries%rowtype;
    v_rider public.riders%rowtype;
    v_assignment public.delivery_assignments%rowtype;
begin
    select *
      into v_delivery
      from public.deliveries
     where id = p_delivery_id
     for update;

    if not found then
        raise exception 'DELIVERY_NOT_FOUND';
    end if;

    if v_delivery.status <> 'pending' then
        raise exception 'DELIVERY_NOT_AVAILABLE';
    end if;

    select *
      into v_rider
      from public.riders
     where id = p_rider_id
     for update;

    if not found then
        raise exception 'RIDER_NOT_FOUND';
    end if;

    if v_rider.status <> 'approved' or not v_rider.is_online then
        raise exception 'RIDER_NOT_ELIGIBLE';
    end if;

    insert into public.delivery_assignments (
        delivery_id,
        rider_id,
        assigned_by,
        status
    )
    values (
        p_delivery_id,
        p_rider_id,
        p_assigned_by,
        'offered'
    )
    returning * into v_assignment;

    update public.deliveries
       set status = 'assigned'
     where id = p_delivery_id;

    insert into public.delivery_events (
        delivery_id,
        rider_id,
        event_type,
        metadata
    )
    values (
        p_delivery_id,
        p_rider_id,
        'assignment_offered',
        jsonb_build_object('assigned_by', p_assigned_by)
    );

    return jsonb_build_object(
        'assignment_id', v_assignment.id,
        'delivery_id', p_delivery_id,
        'rider_id', p_rider_id,
        'status', v_assignment.status
    );
end;
$$;

create or replace function public.dispatch_respond_to_assignment(
    p_assignment_id uuid,
    p_rider_id uuid,
    p_status text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_assignment public.delivery_assignments%rowtype;
    v_delivery public.deliveries%rowtype;
    v_event_type text;
begin
    if p_status not in ('accepted', 'rejected') then
        raise exception 'INVALID_ASSIGNMENT_RESPONSE';
    end if;

    select *
      into v_assignment
      from public.delivery_assignments
     where id = p_assignment_id
     for update;

    if not found then
        raise exception 'ASSIGNMENT_NOT_FOUND';
    end if;

    if v_assignment.rider_id <> p_rider_id then
        raise exception 'ASSIGNMENT_NOT_OWNED';
    end if;

    if v_assignment.status <> 'offered' then
        raise exception 'ASSIGNMENT_NOT_AVAILABLE';
    end if;

    select *
      into v_delivery
      from public.deliveries
     where id = v_assignment.delivery_id
     for update;

    if not found then
        raise exception 'DELIVERY_NOT_FOUND';
    end if;

    if p_status = 'accepted' and v_delivery.status <> 'assigned' then
        raise exception 'DELIVERY_NOT_AVAILABLE';
    end if;

    if p_status = 'rejected' and v_delivery.status <> 'assigned' then
        raise exception 'DELIVERY_NOT_AVAILABLE';
    end if;

    update public.delivery_assignments
       set status = p_status,
           responded_at = now()
     where id = p_assignment_id
     returning * into v_assignment;

    if p_status = 'accepted' then
        update public.deliveries
           set status = 'accepted',
               started_at = coalesce(started_at, now())
         where id = v_delivery.id;

        perform public.transition_master_order_status(
            v_delivery.master_order_id,
            'assigned',
            p_rider_id,
            'Rider accepted delivery assignment',
            jsonb_build_object(
                'delivery_id', v_delivery.id,
                'assignment_id', v_assignment.id
            )
        );

        v_event_type := 'assignment_accepted';
    else
        update public.deliveries
           set status = 'pending'
         where id = v_delivery.id;

        v_event_type := 'assignment_rejected';
    end if;

    insert into public.delivery_events (
        delivery_id,
        rider_id,
        event_type
    )
    values (
        v_delivery.id,
        p_rider_id,
        v_event_type
    );

    return jsonb_build_object(
        'assignment_id', v_assignment.id,
        'delivery_id', v_delivery.id,
        'status', v_assignment.status,
        'delivery_status',
            case
                when p_status = 'accepted' then 'accepted'
                else 'pending'
            end
    );
end;
$$;

revoke all on function public.dispatch_offer_delivery(uuid,uuid,uuid)
    from public, anon, authenticated;

revoke all on function public.dispatch_respond_to_assignment(uuid,uuid,text)
    from public, anon, authenticated;

grant execute on function public.dispatch_offer_delivery(uuid,uuid,uuid)
    to service_role;

grant execute on function public.dispatch_respond_to_assignment(uuid,uuid,text)
    to service_role;

comment on function public.dispatch_offer_delivery(uuid,uuid,uuid) is
    'Atomically creates a rider assignment offer and marks delivery assigned. Service-role only.';

comment on function public.dispatch_respond_to_assignment(uuid,uuid,text) is
    'Atomically accepts/rejects an assignment and synchronizes delivery and master-order state. Service-role only.';

commit;
