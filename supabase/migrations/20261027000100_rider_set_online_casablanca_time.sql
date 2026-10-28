-- WASSLHA
-- rider_set_online: compare the booked slot with Morocco time
--
-- Slots are created and booked with Africa/Casablanca dates (rider_create_slot, rider_book_slot), but the Online
-- check compared them with UTC (current_date / localtime), which is one hour behind Morocco.

begin;

create or replace function public.rider_set_online(p_rider_id uuid, p_is_online boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    v_rider public.riders%rowtype;
    v_now timestamp := timezone('Africa/Casablanca', now());
begin
    select *
      into v_rider
      from public.riders
     where id = p_rider_id
     for update;

    if not found then
        raise exception 'RIDER_NOT_FOUND';
    end if;

    if v_rider.status <> 'approved' then
        raise exception 'RIDER_NOT_APPROVED';
    end if;

    if p_is_online and not exists (
        select 1
          from public.slot_attendance sa
          join public.rider_slots rs on rs.id = sa.slot_id
         where sa.rider_id = p_rider_id
           and sa.status in ('scheduled','checked_in','late')
           and rs.status = 'open'
           and rs.slot_date = v_now::date
           and v_now::time >= rs.start_time
           and v_now::time < rs.end_time
    ) then
        raise exception 'ACTIVE_SLOT_REQUIRED';
    end if;

    update public.riders
       set is_online = p_is_online,
           updated_at = now()
     where id = p_rider_id;

    return jsonb_build_object(
        'id', p_rider_id,
        'is_online', p_is_online,
        'status', v_rider.status
    );
end;
$function$;

commit;
