begin;

revoke all on table public.purchase_approvals from anon, authenticated;
revoke all on table public.purchase_receipts from anon, authenticated;
revoke all on table public.purchase_records from anon, authenticated;

commit;
