-- WASSLHA
-- Merchant operational controls
-- Opening hours + explicit order pause state.

begin;

alter table public.stores
  add column if not exists opening_hours jsonb not null default '{}'::jsonb,
  add column if not exists orders_paused boolean not null default false,
  add column if not exists orders_pause_reason text;

alter table public.stores
  drop constraint if exists stores_orders_pause_reason_check;

alter table public.stores
  add constraint stores_orders_pause_reason_check
  check (orders_paused = true or orders_pause_reason is null);

commit;
