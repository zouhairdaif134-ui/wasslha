-- WASSLHA
-- Rider acceptance: slots + live availability GPS + dispatch offer timeout
-- Berrechid MVP

begin;

create index if not exists rider_locations_rider_recorded_at_idx
    on public.rider_locations (rider_id, recorded_at desc);

create index if not exists slot_attendance_rider_status_slot_idx
    on public.slot_attendance (rider_id, status, slot_id);

create or replace function public.rider_set_online(
    p_rider_id uuid,
    p_is_online boolean
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_rider public.riders%rowtype;
begin
 select * into v_rider from public.riders where id=p_rider_id for update;
 if not found then raise exception 'RIDER_NOT_FOUND'; end if;
 if v_rider.status <> 'approved' then raise exception 'RIDER_NOT_APPROVED'; end if;
 if p_is_online and not exists (
   select 1 from public.slot_attendance sa
   join public.rider_slots rs on rs.id=sa.slot_id
   where sa.rider_id=p_rider_id
     and sa.status in ('scheduled','checked_in','late')
     and rs.status='open' and rs.slot_date=current_date
     and localtime >= rs.start_time and localtime < rs.end_time
 ) then raise exception 'ACTIVE_SLOT_REQUIRED'; end if;
 update public.riders set is_online=p_is_online,updated_at=now() where id=p_rider_id;
 return jsonb_build_object('id',p_rider_id,'is_online',p_is_online,'status',v_rider.status);
end;
$$;

create or replace function public.dispatch_auto_offer_delivery(p_delivery_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
 v_delivery public.deliveries%rowtype; v_rider public.riders%rowtype;
 v_assignment public.delivery_assignments%rowtype; v_distance_km numeric;
begin
 select * into v_delivery from public.deliveries where id=p_delivery_id for update;
 if not found then raise exception 'DELIVERY_NOT_FOUND'; end if;

 if v_delivery.status='assigned' then
   update public.delivery_assignments
      set status='expired',responded_at=coalesce(responded_at,now())
    where delivery_id=p_delivery_id and status='offered'
      and offered_at < now()-interval '60 seconds';
   if not exists (select 1 from public.delivery_assignments where delivery_id=p_delivery_id and status='offered') then
     update public.deliveries set status='pending',updated_at=now() where id=p_delivery_id;
   end if;
 end if;

 select * into v_delivery from public.deliveries where id=p_delivery_id for update;
 if v_delivery.status<>'pending' then raise exception 'DELIVERY_NOT_AVAILABLE'; end if;
 if v_delivery.pickup_latitude is null or v_delivery.pickup_longitude is null then raise exception 'PICKUP_LOCATION_REQUIRED'; end if;

 select r.* into v_rider
 from public.riders r
 join public.users u on u.id=r.id
 join lateral (
   select rl.latitude,rl.longitude,rl.recorded_at from public.rider_locations rl
   where rl.rider_id=r.id order by rl.recorded_at desc limit 1
 ) loc on true
 where u.is_active and r.status='approved' and r.is_online
   and loc.recorded_at >= now()-interval '2 minutes'
   and exists (
     select 1 from public.slot_attendance sa join public.rider_slots rs on rs.id=sa.slot_id
     where sa.rider_id=r.id and sa.status in ('scheduled','checked_in','late')
       and rs.status='open' and rs.slot_date=current_date
       and localtime >= rs.start_time and localtime < rs.end_time
   )
   and not exists (
     select 1 from public.delivery_assignments da
     where da.rider_id=r.id and da.status in ('offered','accepted')
   )
 order by power((loc.latitude::numeric-v_delivery.pickup_latitude),2)
   + power((loc.longitude::numeric-v_delivery.pickup_longitude)*cos(radians(v_delivery.pickup_latitude)),2)
 limit 1;

 if not found then raise exception 'NO_ELIGIBLE_RIDER'; end if;

 select sqrt(power((loc.latitude::numeric-v_delivery.pickup_latitude),2)
   + power((loc.longitude::numeric-v_delivery.pickup_longitude)*cos(radians(v_delivery.pickup_latitude)),2))*111.32
 into v_distance_km from public.rider_locations loc
 where loc.rider_id=v_rider.id order by loc.recorded_at desc limit 1;

 insert into public.delivery_assignments(delivery_id,rider_id,assigned_by,status)
 values(p_delivery_id,v_rider.id,null,'offered') returning * into v_assignment;

 update public.deliveries set status='assigned',updated_at=now() where id=p_delivery_id;
 insert into public.delivery_events(delivery_id,rider_id,event_type,metadata)
 values(p_delivery_id,v_rider.id,'assignment_offered',
   jsonb_build_object('dispatch_mode','auto','candidate_distance_km',round(v_distance_km,3),'offer_timeout_seconds',60));

 return jsonb_build_object('assignment_id',v_assignment.id,'delivery_id',p_delivery_id,
   'rider_id',v_rider.id,'status',v_assignment.status,'dispatch_mode','auto',
   'candidate_distance_km',round(v_distance_km,3),'offer_timeout_seconds',60);
end;
$$;

revoke all on function public.rider_set_online(uuid,boolean) from public,anon,authenticated;
revoke all on function public.dispatch_auto_offer_delivery(uuid) from public,anon,authenticated;
grant execute on function public.rider_set_online(uuid,boolean) to service_role;
grant execute on function public.dispatch_auto_offer_delivery(uuid) to service_role;

commit;