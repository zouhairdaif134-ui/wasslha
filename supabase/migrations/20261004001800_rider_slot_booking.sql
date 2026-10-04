-- WASSLHA
-- Migration #79
-- Atomic rider slot booking
-- Berrechid MVP

begin;

create or replace function public.rider_book_slot(
    p_rider_id uuid,
    p_slot_id uuid
)
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
    select * into v_rider from public.riders where id = p_rider_id for update;
    if not found or v_rider.status <> 'approved' then
        raise exception 'RIDER_NOT_APPROVED';
    end if;

    select * into v_slot from public.rider_slots where id = p_slot_id for update;
    if not found or v_slot.status <> 'open' then
        raise exception 'SLOT_NOT_AVAILABLE';
    end if;

    if v_slot.slot_date < current_date then
        raise exception 'SLOT_IN_PAST';
    end if;

    select count(*) into v_count
    from public.slot_attendance
    where slot_id = p_slot_id
      and status in ('scheduled','checked_in','late');

    if v_count >= v_slot.capacity then
        raise exception 'SLOT_FULL';
    end if;

    insert into public.slot_attendance(slot_id,rider_id,status)
    values(p_slot_id,p_rider_id,'scheduled')
    on conflict (slot_id,rider_id) do update
      set status = case when public.slot_attendance.status = 'cancelled' then 'scheduled' else public.slot_attendance.status end,
          updated_at = now()
    returning * into v_attendance;

    return v_attendance;
end;
$$;

revoke all on function public.rider_book_slot(uuid,uuid) from public, anon, authenticated;
grant execute on function public.rider_book_slot(uuid,uuid) to service_role;

commit;
