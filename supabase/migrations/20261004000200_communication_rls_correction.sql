-- WASSLHA
-- Database correction migration
-- Source of truth: WASSLHA Master Product & Technical Specification v1.0
-- Corrects merchant participant RLS to follow sub_orders.store_id.

begin;

drop policy if exists conversations_select_participants_admin
    on public.conversations;

create policy conversations_select_participants_admin
on public.conversations
for select
to authenticated
using (
    public.has_role('admin')
    or created_by = auth.uid()
    or exists (
        select 1
        from public.master_orders mo
        where mo.id = conversations.master_order_id
          and mo.customer_id = auth.uid()
    )
    or exists (
        select 1
        from public.sub_orders so
        join public.merchants m
            on m.id = (
                select s.merchant_id
                from public.stores s
                where s.id = so.store_id
            )
        where so.master_order_id = conversations.master_order_id
          and m.user_id = auth.uid()
    )
    or exists (
        select 1
        from public.deliveries d
        join public.delivery_assignments da
            on da.delivery_id = d.id
        join public.riders r
            on r.id = da.rider_id
        where d.master_order_id = conversations.master_order_id
          and r.user_id = auth.uid()
    )
);

drop policy if exists messages_select_conversation_participants_admin
    on public.messages;

create policy messages_select_conversation_participants_admin
on public.messages
for select
to authenticated
using (
    public.has_role('admin')
    or exists (
        select 1
        from public.conversations c
        where c.id = messages.conversation_id
          and (
              c.created_by = auth.uid()
              or exists (
                  select 1
                  from public.master_orders mo
                  where mo.id = c.master_order_id
                    and mo.customer_id = auth.uid()
              )
              or exists (
                  select 1
                  from public.sub_orders so
                  join public.merchants m
                      on m.id = (
                          select s.merchant_id
                          from public.stores s
                          where s.id = so.store_id
                      )
                  where so.master_order_id = c.master_order_id
                    and m.user_id = auth.uid()
              )
              or exists (
                  select 1
                  from public.deliveries d
                  join public.delivery_assignments da
                      on da.delivery_id = d.id
                  join public.riders r
                      on r.id = da.rider_id
                  where d.master_order_id = c.master_order_id
                    and r.user_id = auth.uid()
              )
          )
    )
);

commit;
