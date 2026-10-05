-- WASSLHA
-- Rider slot timezone hardening
-- Berrechid MVP uses Africa/Casablanca operational time.

begin;

create or replace function public.rider_create_slot(
  p_rider_id uuid,
  p_slot_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_capacity integer default 1
) returns public.rider_slots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.rider_slots;
  v_rest_minutes integer := 30;
  v_start timestamp;
  v_end timestamp;
  v_today date := timezone('Africa/Casablanca', now())::date;
begin
  if p_slot_date < v_today then raise exception 'SLOT_DATE_IN_PAST'; end if;
  if p_end_time <= p_start_time then raise exception 'INVALID_SLOT_TIME'; end if;
  if p_capacity < 1 or p_capacity > 20 then raise exception 'INVALID_SLOT_CAPACITY'; end if;

  select coalesce((setting_value->>'minutes')::integer,30)
    into v_rest_minutes
  from public.admin_settings
  where setting_key = 'rider_minimum_rest_minutes'
  limit 1;

  if not exists (select 1 from public.riders where id=p_rider_id and status='approved') then
    raise exception 'RIDER_NOT_APPROVED';
  end if;

  v_start := p_slot_date + p_start_time;
  v_end := p_slot_date + p_end_time;

  if exists (
    select 1 from public.rider_slots s
    where s.rider_id=p_rider_id
      and s.status<>'cancelled'
      and v_start < (s.slot_date+s.end_time+make_interval(mins=>v_rest_minutes))
      and v_end > (s.slot_date+s.start_time-make_interval(mins=>v_rest_minutes))
  ) then raise exception 'SLOT_OVERLAP_OR_REST_VIOLATION'; end if;

  insert into public.rider_slots(rider_id,slot_date,start_time,end_time,capacity,status)
  values(p_rider_id,p_slot_date,p_start_time,p_end_time,p_capacity,'open')
  returning * into v_slot;
  return v_slot;
end;
$$;

create or replace function public.rider_book_slot(p_rider_id uuid,p_slot_id uuid)
returns public.slot_attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.rider_slots%rowtype;
  v_rider public.riders%rowtype;
  v_count integer;
  v_attendance public.slot_attendance%rowtype;
begin
  select * into v_rider from public.riders where id=p_rider_id for update;
  if not found or v_rider.status<>'approved' then raise exception 'RIDER_NOT_APPROVED'; end if;
  select * into v_slot from public.rider_slots where id=p_slot_id for update;
  if not found or v_slot.status<>'open' then raise exception 'SLOT_NOT_AVAILABLE'; end if;
  if v_slot.slot_date < timezone('Africa/Casablanca',now())::date then raise exception 'SLOT_IN_PAST'; end if;
  select count(*) into v_count from public.slot_attendance where slot_id=p_slot_id and status in ('scheduled','checked_in','late');
  if v_count >= v_slot.capacity then raise exception 'SLOT_FULL'; end if;
  insert into public.slot_attendance(slot_id,rider_id,status)
  values(p_slot_id,p_rider_id,'scheduled')
  on conflict(slot_id,rider_id) do update set status=case when public.slot_attendance.status='cancelled' then 'scheduled' else public.slot_attendance.status end,updated_at=now()
  returning * into v_attendance;
  return v_attendance;
end;
$$;

create or replace function public.rider_join_slot_waitlist(p_rider_id uuid,p_slot_id uuid)
returns public.slot_waitlist
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.rider_slots%rowtype;
  v_rider public.riders%rowtype;
  v_position integer;
  v_row public.slot_waitlist%rowtype;
begin
  select * into v_rider from public.riders where id=p_rider_id for update;
  if not found or v_rider.status<>'approved' then raise exception 'RIDER_NOT_APPROVED'; end if;
  select * into v_slot from public.rider_slots where id=p_slot_id for update;
  if not found or v_slot.status<>'open' then raise exception 'SLOT_NOT_AVAILABLE'; end if;
  if v_slot.slot_date < timezone('Africa/Casablanca',now())::date then raise exception 'SLOT_IN_PAST'; end if;
  if exists(select 1 from public.slot_attendance where slot_id=p_slot_id and rider_id=p_rider_id and status in ('scheduled','checked_in','late')) then raise exception 'RIDER_ALREADY_BOOKED'; end if;
  if exists(select 1 from public.slot_waitlist where slot_id=p_slot_id and rider_id=p_rider_id and status in ('waiting','promoted')) then raise exception 'ALREADY_ON_WAITLIST'; end if;
  select coalesce(max(position),0)+1 into v_position from public.slot_waitlist where slot_id=p_slot_id and status='waiting';
  insert into public.slot_waitlist(slot_id,rider_id,position,status) values(p_slot_id,p_rider_id,v_position,'waiting')
  on conflict(slot_id,rider_id) do update set position=excluded.position,status='waiting',updated_at=now()
  returning * into v_row;
  return v_row;
end;
$$;

commit;
