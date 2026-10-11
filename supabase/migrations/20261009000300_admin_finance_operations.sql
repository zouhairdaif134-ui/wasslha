-- WASSLHA
-- Admin finance operations: rider cash list, cash handover, merchant settlement
-- generation and status changes, all audited. Called by the API with the service
-- role on behalf of an authenticated admin.

create or replace function public.admin_rider_cash_list(p_admin_user_id uuid, p_limit integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit bigint;
  v jsonb;
begin
  if not exists (
    select 1 from public.users u
      join public.user_roles ur on ur.user_id = u.id
      join public.roles r on r.id = ur.role_id
     where u.id = p_admin_user_id and u.is_active and r.code = 'admin'
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  p_limit := least(greatest(coalesce(p_limit, 50), 1), 100);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  select case when jsonb_typeof(setting_value) = 'number' then (setting_value #>> '{}')::numeric::bigint end
    into v_limit
    from public.admin_settings where setting_key = 'finance.rider_cash_limit_minor';
  v_limit := coalesce(v_limit, 100000);

  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.balance_minor desc, x.full_name)
        from (
          select r.id, u.full_name, u.phone, r.status,
                 coalesce(cb.balance_minor, 0) as balance_minor,
                 v_limit as limit_minor,
                 greatest(v_limit - coalesce(cb.balance_minor, 0), 0) as remaining_minor,
                 coalesce(cb.status, 'active') as cash_status,
                 (coalesce(cb.status, 'active') <> 'active' or coalesce(cb.balance_minor, 0) >= v_limit) as blocked
            from public.riders r
            join public.users u on u.id = r.id
            left join public.rider_cash_balances cb on cb.rider_id = r.id
           order by coalesce(cb.balance_minor, 0) desc, u.full_name
           limit p_limit offset p_offset
        ) x
    ), '[]'::jsonb),
    'total', (select count(*) from public.riders)
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_record_rider_cash_handover(
  p_admin_user_id uuid, p_rider_id uuid, p_amount_minor bigint, p_idempotency_key text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_key text := trim(coalesce(p_idempotency_key, ''));
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'INVALID_HANDOVER_AMOUNT';
  end if;
  if length(v_key) < 8 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  v_result := public.record_rider_cash_handover(p_rider_id, p_amount_minor, p_admin_user_id, v_key, p_note);

  if not exists (
    select 1 from public.audit_logs
     where action = 'finance.rider_cash_handover' and metadata ->> 'idempotency_key' = v_key
  ) then
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data, metadata)
    values (p_admin_user_id, 'finance.rider_cash_handover', 'rider', p_rider_id, v_result,
            jsonb_build_object('idempotency_key', v_key, 'note', p_note));
  end if;

  return v_result;
end;
$$;

create or replace function public.admin_generate_merchant_settlements(p_admin_user_id uuid, p_period_start date, p_period_end date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := public.generate_merchant_settlements(p_period_start, p_period_end, p_admin_user_id);

  insert into public.audit_logs (actor_user_id, action, entity_type, after_data, metadata)
  values (p_admin_user_id, 'finance.settlements_generated', 'merchant_settlement', v_result,
          jsonb_build_object('period_start', p_period_start, 'period_end', p_period_end));

  return v_result;
end;
$$;

create or replace function public.admin_set_merchant_settlement_status(
  p_admin_user_id uuid, p_settlement_id uuid, p_new_status text, p_reference text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.merchant_settlements%rowtype;
  v_before jsonb;
begin
  if not exists (
    select 1 from public.users u
      join public.user_roles ur on ur.user_id = u.id
      join public.roles r on r.id = ur.role_id
     where u.id = p_admin_user_id and u.is_active and r.code = 'admin'
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_new_status not in ('approved', 'paid', 'cancelled') then
    raise exception 'INVALID_SETTLEMENT_STATUS';
  end if;

  select * into v_row from public.merchant_settlements where id = p_settlement_id for update;
  if not found then
    raise exception 'SETTLEMENT_NOT_FOUND';
  end if;

  if not (
       (v_row.status = 'pending'  and p_new_status in ('approved', 'cancelled'))
    or (v_row.status = 'approved' and p_new_status in ('paid', 'cancelled'))
  ) then
    raise exception 'INVALID_SETTLEMENT_TRANSITION';
  end if;

  v_before := jsonb_build_object('status', v_row.status, 'paid_at', v_row.paid_at);

  update public.merchant_settlements
     set status = p_new_status,
         paid_at = case when p_new_status = 'paid' then now() else paid_at end
   where id = p_settlement_id
   returning * into v_row;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, metadata)
  values (p_admin_user_id, 'finance.settlement_' || p_new_status, 'merchant_settlement', p_settlement_id, v_before,
          jsonb_build_object('status', v_row.status, 'paid_at', v_row.paid_at, 'net_amount_minor', v_row.net_amount_minor),
          jsonb_build_object('reference', nullif(trim(coalesce(p_reference, '')), '')));

  return jsonb_build_object('id', v_row.id, 'status', v_row.status, 'paid_at', v_row.paid_at, 'net_amount_minor', v_row.net_amount_minor);
end;
$$;

revoke all on function public.admin_rider_cash_list(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_record_rider_cash_handover(uuid, uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.admin_generate_merchant_settlements(uuid, date, date) from public, anon, authenticated;
revoke all on function public.admin_set_merchant_settlement_status(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_rider_cash_list(uuid, integer, integer) to service_role;
grant execute on function public.admin_record_rider_cash_handover(uuid, uuid, bigint, text, text) to service_role;
grant execute on function public.admin_generate_merchant_settlements(uuid, date, date) to service_role;
grant execute on function public.admin_set_merchant_settlement_status(uuid, uuid, text, text) to service_role;
