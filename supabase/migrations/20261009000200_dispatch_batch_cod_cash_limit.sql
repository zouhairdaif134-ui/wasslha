-- WASSLHA
-- The scheduled batch dispatch (dispatch_auto_assign_pending) did not apply the
-- rider COD cash limit, while the immediate offer path (dispatch_auto_offer_delivery)
-- did. A rider over the limit could therefore still receive COD offers through the
-- batch retry. Same rule now applies on both paths:
-- a COD order is only offered to riders for whom rider_can_take_cod_order() is true.

create or replace function public.dispatch_auto_assign_pending(p_limit integer DEFAULT 20, p_offer_timeout_seconds integer DEFAULT 120)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    v_delivery public.deliveries%rowtype;
    v_rider_id uuid;
    v_assignment_id uuid;
    v_assigned integer := 0;
    v_expired integer := 0;
    v_distance numeric;
    v_method text;
    v_total bigint;
    v_local_date date := timezone('Africa/Casablanca', now())::date;
    v_local_time time := timezone('Africa/Casablanca', now())::time;
begin
    if p_limit < 1 or p_limit > 100 then raise exception 'INVALID_DISPATCH_LIMIT'; end if;
    if p_offer_timeout_seconds < 30 or p_offer_timeout_seconds > 900 then raise exception 'INVALID_OFFER_TIMEOUT'; end if;

    update public.delivery_assignments da
       set status = 'cancelled',
           responded_at = coalesce(da.responded_at, now()),
           rejection_reason = 'offer_timeout'
     where da.status = 'offered'
       and da.offered_at < now() - make_interval(secs => p_offer_timeout_seconds);
    get diagnostics v_expired = row_count;

    update public.deliveries d
       set status = 'pending', updated_at = now()
     where d.status = 'assigned'
       and not exists (
           select 1 from public.delivery_assignments da
            where da.delivery_id = d.id and da.status in ('offered', 'accepted')
       );

    for v_delivery in
        select d.*
          from public.deliveries d
          join public.master_orders mo on mo.id = d.master_order_id
         where d.status = 'pending'
           and mo.status = 'ready_for_pickup'
           and d.pickup_latitude is not null
           and d.pickup_longitude is not null
           and not exists (
               select 1 from public.delivery_assignments da
                where da.delivery_id = d.id and da.status in ('offered', 'accepted')
           )
         order by d.created_at asc
         limit p_limit
    loop
        v_rider_id := null;
        v_distance := null;

        select mo.payment_method::text, mo.total_minor::bigint
          into v_method, v_total
          from public.master_orders mo
         where mo.id = v_delivery.master_order_id;

        select x.rider_id, x.distance_meters
          into v_rider_id, v_distance
          from (
              select r.id as rider_id,
                     6371000 * 2 * asin(sqrt(
                       power(sin(radians((rl.latitude::numeric - v_delivery.pickup_latitude::numeric) / 2)), 2)
                       + cos(radians(v_delivery.pickup_latitude::numeric))
                       * cos(radians(rl.latitude::numeric))
                       * power(sin(radians((rl.longitude::numeric - v_delivery.pickup_longitude::numeric) / 2)), 2)
                     )) as distance_meters
                from public.riders r
                join public.users u on u.id = r.id and u.is_active
                join lateral (
                    select rl.latitude, rl.longitude, rl.recorded_at
                      from public.rider_locations rl
                     where rl.rider_id = r.id
                       and rl.recorded_at >= now() - interval '2 minutes'
                     order by rl.recorded_at desc
                     limit 1
                ) rl on true
               where r.status = 'approved'
                 and r.is_online = true
                 and exists (
                     select 1
                       from public.slot_attendance sa
                       join public.rider_slots rs on rs.id = sa.slot_id
                      where sa.rider_id = r.id
                        and sa.status in ('scheduled','checked_in','late')
                        and rs.status = 'open'
                        and rs.slot_date = v_local_date
                        and v_local_time >= rs.start_time
                        and v_local_time < rs.end_time
                 )
                 and not exists (
                     select 1
                       from public.delivery_assignments active
                      where active.rider_id = r.id
                        and active.status in ('offered','accepted')
                 )
                 and (v_method <> 'cod' or public.rider_can_take_cod_order(r.id, v_total))
          ) x
         where x.distance_meters <= 10000
         order by x.distance_meters asc
         limit 1;

        if v_rider_id is null then continue; end if;

        begin
            insert into public.delivery_assignments (delivery_id, rider_id, assigned_by, status)
            values (v_delivery.id, v_rider_id, null, 'offered')
            returning id into v_assignment_id;

            update public.deliveries
               set status = 'assigned', updated_at = now()
             where id = v_delivery.id;

            insert into public.delivery_events (delivery_id, rider_id, event_type, metadata)
            values (
                v_delivery.id,
                v_rider_id,
                'assignment_offered',
                jsonb_build_object(
                    'source','auto_dispatch',
                    'distance_meters',round(v_distance)::integer,
                    'offer_timeout_seconds',p_offer_timeout_seconds
                )
            );

            v_assigned := v_assigned + 1;
        exception when unique_violation then
            null;
        end;
    end loop;

    return jsonb_build_object('assigned', v_assigned, 'expired_offers', v_expired);
end;
$function$;
