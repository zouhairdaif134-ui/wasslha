-- WASSLHA
-- Rider waitlist integrity
-- Berrechid MVP

begin;

create or replace function public.rider_join_slot_waitlist(
  p_rider_id uuid,
  p_slot_id uuid
) returns public.slot_waitlist
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
  select * into v_rider
  from public.riders
  where id = p_rider_id
  for update;

  if not found or v_rider.status <> 'approved' then
    raise exception 'RIDER_NOT_APPROVED';
  end if;

  select * into v_slot
  from public.rider_slots
  where id = p_slot_id
  for update;

  if not found or v_slot.status <> 'open' then
    raise exception 'SLOT_NOT_AVAILABLE';
  end if;

  if v_slot.slot_date < current_date then
    raise exception 'SLOT_IN_PAST';
  end if;

  if exists (
    select 1 from public.slot_attendance
    where slot_id = p_slot_id
      and rider_id = p_rider_id
      and status in ('scheduled','checked_in','late')
  ) then
    raise exception 'RIDER_ALREADY_BOOKED';
  end if;

  if exists (
    select 1 from public.slot_waitlist
    where slot_id = p_slot_id
      and rider_id = p_rider_id
      and status in ('waiting','promoted')
  ) then
    raise exception 'ALREADY_ON_WAITLIST';
  end if;

  select coalesce(max(position), 0) + 1
    into v_position
  from public.slot_waitlist
  where slot_id = p_slot_id
    and status = 'waiting';

  insert into public.slot_waitlist(slot_id, rider_id, position, status)
  values (p_slot_id, p_rider_id, v_position, 'waiting')
  on conflict (slot_id, rider_id) do update
    set position = excluded.position,
        status = 'waiting',
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.rider_join_slot_waitlist(uuid,uuid)
  from public, anon, authenticated;

grant execute on function public.rider_join_slot_waitlist(uuid,uuid)
  to service_role;

commit;
