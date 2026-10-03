begin;

create or replace function public.admin_governance_overview(p_admin_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
 if not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=p_admin_user_id and r.code='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 return jsonb_build_object(
  'settings',(select count(*) from admin_settings),
  'sensitive_settings',(select count(*) from admin_settings where is_sensitive),
  'open_risk_flags',(select count(*) from risk_flags where status in ('open','reviewing')),
  'critical_risk_flags',(select count(*) from risk_flags where status in ('open','reviewing') and severity='critical'),
  'active_app_versions',(select count(*) from app_versions where is_active),
  'latest_releases',(select count(*) from app_versions where latest_version),
  'setting_changes_today',(select count(*) from setting_history where created_at >= (current_date at time zone 'Africa/Casablanca'))
 );
end $$;

revoke all on function public.admin_governance_overview(uuid) from public,anon,authenticated;
grant execute on function public.admin_governance_overview(uuid) to service_role;
commit;