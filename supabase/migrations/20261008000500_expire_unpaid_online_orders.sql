-- WASSLHA
-- Automatic expiry of unpaid online orders (Master section 9: online payment is
-- paid in full upfront). An online order that is still "pending" and not paid
-- after a time limit is cancelled through the official transition functions, so
-- status history is preserved and the order state machine is respected.
-- Intended to be called by the API scheduled job with the service role.

begin;

create or replace function public.expire_unpaid_online_orders(p_max_age_minutes integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minutes integer := least(greatest(coalesce(p_max_age_minutes, 30), 5), 1440);
  v_order record;
  v_sub record;
  v_cancelled integer := 0;
  v_failed integer := 0;
begin
  for v_order in
    select mo.id
      from public.master_orders mo
     where mo.payment_method = 'online'
       and coalesce(mo.payment_status, '') <> 'paid'
       and mo.status = 'pending'
       and mo.created_at < now() - make_interval(mins => v_minutes)
     order by mo.created_at
     limit 100
     for update skip locked
  loop
    begin
      for v_sub in
        select so.id
          from public.sub_orders so
         where so.master_order_id = v_order.id
           and so.status = 'pending'
      loop
        perform public.transition_sub_order_status(
          v_sub.id, 'cancelled', null,
          'Online payment not completed in time',
          '{"source":"payment_expiry"}'::jsonb
        );
      end loop;

      perform public.transition_master_order_status(
        v_order.id, 'cancelled', null,
        'Online payment not completed in time',
        '{"source":"payment_expiry"}'::jsonb
      );

      update public.payments
         set status = 'cancelled'
       where master_order_id = v_order.id
         and status = 'pending';

      v_cancelled := v_cancelled + 1;
    exception when others then
      v_failed := v_failed + 1;
      raise warning 'expire_unpaid_online_orders failed for order %: %', v_order.id, sqlerrm;
    end;
  end loop;

  return jsonb_build_object(
    'cancelled', v_cancelled,
    'failed', v_failed,
    'max_age_minutes', v_minutes
  );
end;
$$;

revoke all on function public.expire_unpaid_online_orders(integer)
  from public, anon, authenticated;
grant execute on function public.expire_unpaid_online_orders(integer) to service_role;

comment on function public.expire_unpaid_online_orders(integer) is
  'Cancels pending online orders not paid within p_max_age_minutes (clamped 5-1440). Service role only.';

commit;
