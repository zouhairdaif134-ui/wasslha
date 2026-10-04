-- WASSLHA
-- Supporting indexes for Get Request purchase workflow foreign keys.

begin;

create index if not exists purchase_approvals_decided_by_idx on public.purchase_approvals(decided_by);
create index if not exists purchase_approvals_purchase_record_idx on public.purchase_approvals(purchase_record_id);
create index if not exists purchase_approvals_requested_by_idx on public.purchase_approvals(requested_by);
create index if not exists purchase_receipts_uploaded_by_idx on public.purchase_receipts(uploaded_by);
create index if not exists purchase_receipts_verified_by_idx on public.purchase_receipts(verified_by);

commit;
