-- WASSLHA
-- Correct rider ownership in "جيب ليا" RLS.
-- riders.id is the user identity; riders has no user_id column.

begin;

drop policy if exists get_request_offers_select_customer_rider_admin
  on public.get_request_offers;

create policy get_request_offers_select_customer_rider_admin
on public.get_request_offers
for select
to authenticated
using (
  public.has_role('admin')
  or exists (
    select 1 from public.get_requests gr
    where gr.id = get_request_offers.get_request_id
      and gr.customer_id = auth.uid()
  )
  or exists (
    select 1 from public.riders r
    where r.id = get_request_offers.rider_id
      and r.id = auth.uid()
  )
);

commit;
