-- WASSLHA
-- Admin Dashboard operational read models
-- Berrechid MVP
-- Read-only RPCs. Mutations remain backend-controlled and must be audited.

begin;

create or replace function public.admin_orders_list(
    p_admin_user_id uuid,
    p_status text default null,
    p_limit integer default 50,
    p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v jsonb;
begin
 if not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=p_admin_user_id and r.code='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 p_limit:=least(greatest(coalesce(p_limit,50),1),100); p_offset:=greatest(coalesce(p_offset,0),0);
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select mo.id,mo.order_number,mo.status,mo.payment_method,mo.payment_status,mo.currency,mo.total_minor,
           mo.customer_id,u.full_name customer_name,u.phone customer_phone,mo.created_at,mo.updated_at,mo.placed_at,mo.delivered_at
    from master_orders mo join users u on u.id=mo.customer_id
    where (p_status is null or mo.status=p_status)
    order by mo.created_at desc limit p_limit offset p_offset
  ) x),'[]'::jsonb),
  'total',(select count(*) from master_orders mo where p_status is null or mo.status=p_status)
 ) into v; return v;
end $$;

create or replace function public.admin_merchants_list(
    p_admin_user_id uuid,
    p_status text default null,
    p_limit integer default 50,
    p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v jsonb;
begin
 if not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=p_admin_user_id and r.code='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 p_limit:=least(greatest(coalesce(p_limit,50),1),100); p_offset:=greatest(coalesce(p_offset,0),0);
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select m.id,m.business_name,m.legal_name,m.phone,m.email,m.status,m.rejection_reason,m.approved_at,
           m.user_id,u.full_name owner_name,u.phone owner_phone,
           (select count(*) from stores s where s.merchant_id=m.id) store_count,m.created_at,m.updated_at
    from merchants m join users u on u.id=m.user_id
    where (p_status is null or m.status=p_status)
    order by m.created_at desc limit p_limit offset p_offset
  ) x),'[]'::jsonb),
  'total',(select count(*) from merchants m where p_status is null or m.status=p_status)
 ) into v; return v;
end $$;

create or replace function public.admin_riders_list(
    p_admin_user_id uuid,
    p_status text default null,
    p_limit integer default 50,
    p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v jsonb;
begin
 if not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=p_admin_user_id and r.code='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 p_limit:=least(greatest(coalesce(p_limit,50),1),100); p_offset:=greatest(coalesce(p_offset,0),0);
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select r.id,r.status,r.vehicle_type,r.vehicle_plate,r.is_online,r.approved_at,
           u.full_name,u.phone,r.created_at,r.updated_at,
           (select count(*) from rider_violations rv where rv.rider_id=r.id and rv.status='open') open_violations,
           (select count(*) from rider_earnings re where re.rider_id=r.id and re.status in ('pending','approved')) pending_earnings
    from riders r join users u on u.id=r.id
    where (p_status is null or r.status=p_status)
    order by r.created_at desc limit p_limit offset p_offset
  ) x),'[]'::jsonb),
  'total',(select count(*) from riders r where p_status is null or r.status=p_status)
 ) into v; return v;
end $$;

create or replace function public.admin_finance_list(
    p_admin_user_id uuid,
    p_kind text default 'payments',
    p_limit integer default 50,
    p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v jsonb;
begin
 if not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=p_admin_user_id and r.code='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 p_limit:=least(greatest(coalesce(p_limit,50),1),100); p_offset:=greatest(coalesce(p_offset,0),0);
 if p_kind='payments' then
   select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
     select p.id,p.master_order_id,mo.order_number,p.customer_id,u.full_name customer_name,p.payment_method,p.status,p.amount_minor,p.currency,p.provider,p.created_at,p.updated_at
     from payments p join master_orders mo on mo.id=p.master_order_id join users u on u.id=p.customer_id
     order by p.created_at desc limit p_limit offset p_offset) x),'[]'::jsonb),
     'total',(select count(*) from payments)) into v;
 elsif p_kind='settlements' then
   select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
     select s.id,s.merchant_id,m.business_name,s.period_start,s.period_end,s.gross_amount_minor,s.commission_minor,s.refund_minor,s.adjustment_minor,s.net_amount_minor,s.status,s.paid_at,s.created_at
     from merchant_settlements s join merchants m on m.id=s.merchant_id
     order by s.created_at desc limit p_limit offset p_offset) x),'[]'::jsonb),
     'total',(select count(*) from merchant_settlements)) into v;
 else
   select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
     select id,master_order_id,sub_order_id,payment_id,entry_type,direction,amount_minor,currency,reference_type,reference_id,description,created_at
     from financial_ledger order by created_at desc limit p_limit offset p_offset) x),'[]'::jsonb),
     'total',(select count(*) from financial_ledger)) into v;
 end if; return v;
end $$;

create or replace function public.admin_support_list(
    p_admin_user_id uuid,
    p_kind text default 'tickets',
    p_limit integer default 50,
    p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v jsonb;
begin
 if not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=p_admin_user_id and r.code='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 p_limit:=least(greatest(coalesce(p_limit,50),1),100); p_offset:=greatest(coalesce(p_offset,0),0);
 if p_kind='complaints' then
   select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
     select c.id,c.user_id,u.full_name user_name,c.master_order_id,mo.order_number,c.complaint_type,c.description,c.status,c.resolution,c.resolved_by,c.resolved_at,c.created_at,c.updated_at
     from complaints c join users u on u.id=c.user_id left join master_orders mo on mo.id=c.master_order_id
     order by c.created_at desc limit p_limit offset p_offset) x),'[]'::jsonb),
     'total',(select count(*) from complaints)) into v;
 else
   select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
     select t.id,t.user_id,u.full_name user_name,t.master_order_id,mo.order_number,t.category,t.subject,t.priority,t.status,t.assigned_to,t.resolved_at,t.created_at,t.updated_at
     from support_tickets t join users u on u.id=t.user_id left join master_orders mo on mo.id=t.master_order_id
     order by t.created_at desc limit p_limit offset p_offset) x),'[]'::jsonb),
     'total',(select count(*) from support_tickets)) into v;
 end if; return v;
end $$;

create or replace function public.admin_users_list(
    p_admin_user_id uuid,
    p_limit integer default 50,
    p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v jsonb;
begin
 if not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=p_admin_user_id and r.code='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 p_limit:=least(greatest(coalesce(p_limit,50),1),100); p_offset:=greatest(coalesce(p_offset,0),0);
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select u.id,u.full_name,u.phone,u.preferred_language,u.is_active,u.created_at,u.updated_at,
      coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'code',r.code,'name',r.name) order by r.code) from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=u.id),'[]'::jsonb) roles
    from users u order by u.created_at desc limit p_limit offset p_offset
  ) x),'[]'::jsonb),
  'total',(select count(*) from users)
 ) into v; return v;
end $$;

create or replace function public.admin_audit_list(
    p_admin_user_id uuid,
    p_limit integer default 100,
    p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v jsonb;
begin
 if not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=p_admin_user_id and r.code='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 p_limit:=least(greatest(coalesce(p_limit,100),1),100);
 p_offset:=greatest(coalesce(p_offset,0),0);
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select a.id,a.actor_user_id,u.full_name actor_name,a.action,a.entity_type,a.entity_id,a.before_data,a.after_data,a.metadata,a.ip_address::text ip_address,a.user_agent,a.created_at
    from audit_logs a left join users u on u.id=a.actor_user_id
    order by a.created_at desc limit p_limit offset p_offset
  ) x),'[]'::jsonb),
  'total',(select count(*) from audit_logs)
 ) into v; return v;
end $$;

revoke all on function public.admin_orders_list(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.admin_merchants_list(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.admin_riders_list(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.admin_finance_list(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.admin_support_list(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.admin_users_list(uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.admin_audit_list(uuid,integer,integer) from public,anon,authenticated;

grant execute on function public.admin_orders_list(uuid,text,integer,integer) to service_role;
grant execute on function public.admin_merchants_list(uuid,text,integer,integer) to service_role;
grant execute on function public.admin_riders_list(uuid,text,integer,integer) to service_role;
grant execute on function public.admin_finance_list(uuid,text,integer,integer) to service_role;
grant execute on function public.admin_support_list(uuid,text,integer,integer) to service_role;
grant execute on function public.admin_users_list(uuid,integer,integer) to service_role;
grant execute on function public.admin_audit_list(uuid,integer,integer) to service_role;

commit;
