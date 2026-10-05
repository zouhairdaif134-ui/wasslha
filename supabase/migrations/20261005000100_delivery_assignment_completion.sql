begin;

create or replace function public.sync_terminal_delivery_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('delivered','failed','cancelled')
     and old.status is distinct from new.status then
    update public.delivery_assignments
       set status = case when new.status = 'delivered' then 'completed' else 'cancelled' end,
           completed_at = case when new.status = 'delivered' then coalesce(completed_at, now()) else completed_at end,
           responded_at = coalesce(responded_at, now())
     where delivery_id = new.id
       and status = 'accepted';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_terminal_delivery_assignment on public.deliveries;
create trigger trg_sync_terminal_delivery_assignment
after update of status on public.deliveries
for each row
execute function public.sync_terminal_delivery_assignment();

revoke all on function public.sync_terminal_delivery_assignment() from public, anon, authenticated;
grant execute on function public.sync_terminal_delivery_assignment() to service_role;

commit;