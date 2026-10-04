begin;

alter table public.rider_slots add column if not exists rider_id uuid references public.riders(id) on delete cascade;

alter table public.rider_slots drop constraint if exists rider_slots_slot_date_start_time_end_time_key;
alter table public.rider_slots add constraint rider_slots_rider_date_time_key unique (rider_id, slot_date, start_time, end_time);

create index if not exists idx_rider_slots_rider_date on public.rider_slots (rider_id, slot_date, start_time);

create or replace function public.rider_create_slot(
  p_rider_id uuid,
  p_slot_date date,
  p_start_time time,
  p_end_time time,
  p_capacity integer default 1
)
returns public.rider_slots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.rider_slots;
  v_rest_minutes integer := 30;
  v_start timestamp;
  v_end timestamp;
begin
  if p_slot_date < current_date then
    raise exception 'SLOT_DATE_IN_PAST';
  end if;
  if p_end_time <= p_start_time then
    raise exception 'INVALID_SLOT_TIME';
  end if;
  if p_capacity < 1 or p_capacity > 20 then
    raise exception 'INVALID_SLOT_CAPACITY';
  end if;

  select coalesce((setting_value->>'minutes')::integer,30)
    into v_rest_minutes
  from public.admin_settings
  where setting_key = 'rider_minimum_rest_minutes'
  limit 1;

  if not exists (
    select 1 from public.riders
    where id = p_rider_id and status = 'approved'
  ) then
    raise exception 'RIDER_NOT_APPROVED';
  end if;

  v_start := p_slot_date + p_start_time;
  v_end := p_slot_date + p_end_time;

  if exists (
    select 1 from public.rider_slots s
    where s.rider_id = p_rider_id
      and s.status <> 'cancelled'
      and v_start < (s.slot_date + s.end_time + make_interval(mins => v_rest_minutes))
      and v_end > (s.slot_date + s.start_time - make_interval(mins => v_rest_minutes))
  ) then
    raise exception 'SLOT_OVERLAP_OR_REST_VIOLATION';
  end if;

  insert into public.rider_slots(rider_id,slot_date,start_time,end_time,capacity,status)
  values(p_rider_id,p_slot_date,p_start_time,p_end_time,p_capacity,'open')
  returning * into v_slot;

  return v_slot;
end;
$$;

revoke all on function public.rider_create_slot(uuid,date,time,time,integer) from public, anon, authenticated;
grant execute on function public.rider_create_slot(uuid,date,time,time,integer) to service_role;

commit;
