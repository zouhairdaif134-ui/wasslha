begin;

alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete restrict;
create index if not exists order_items_variant_idx on public.order_items(variant_id);

create or replace function public.create_master_order(
    p_customer_id uuid,
    p_delivery_address_id uuid,
    p_payment_method text,
    p_customer_note text,
    p_idempotency_key text,
    p_items jsonb,
    p_delivery_fee_minor integer default 0,
    p_discount_minor integer default 0,
    p_service_fee_minor integer default 0,
    p_tip_minor integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.master_orders%rowtype;
    v_item jsonb;
    v_product public.products%rowtype;
    v_variant public.product_variants%rowtype;
    v_variant_id uuid;
    v_sub_order_id uuid;
    v_subtotal integer := 0;
    v_total integer := 0;
    v_store_subtotal integer;
    v_qty numeric;
    v_line_total integer;
    v_unit_price integer;
    v_order_number text;
    v_sub_order_number text;
    v_existing jsonb;
    v_existing_order_id uuid;
begin
    if p_customer_id is null or p_delivery_address_id is null or p_idempotency_key is null
       or length(trim(p_idempotency_key)) < 8 or length(trim(p_idempotency_key)) > 128 then
        raise exception 'INVALID_ORDER_REQUEST';
    end if;
    if p_payment_method not in ('cod','online') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
    if p_delivery_fee_minor < 0 or p_discount_minor < 0 or p_service_fee_minor < 0 or p_tip_minor < 0 then raise exception 'INVALID_ORDER_AMOUNT'; end if;
    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'ORDER_ITEMS_REQUIRED'; end if;

    select to_jsonb(mo) into v_existing from public.master_orders mo
    where mo.customer_id=p_customer_id and mo.idempotency_key=trim(p_idempotency_key) limit 1;
    if v_existing is not null then return jsonb_build_object('replayed',true,'order',v_existing); end if;

    if not exists (select 1 from public.addresses a where a.id=p_delivery_address_id and a.user_id=p_customer_id and a.is_active=true) then
        raise exception 'DELIVERY_ADDRESS_NOT_FOUND';
    end if;

    v_order_number := 'WSL-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') || '-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    insert into public.master_orders(customer_id,delivery_address_id,order_number,payment_method,payment_status,currency,customer_note,idempotency_key,placed_at)
    values(p_customer_id,p_delivery_address_id,v_order_number,p_payment_method,'pending','MAD',nullif(trim(p_customer_note),''),trim(p_idempotency_key),now())
    returning * into v_order;

    for v_item in select value from jsonb_array_elements(p_items) loop
        if not (v_item ? 'product_id') or not (v_item ? 'quantity') then raise exception 'INVALID_ORDER_ITEM'; end if;
        begin v_qty := (v_item->>'quantity')::numeric; exception when others then raise exception 'INVALID_ORDER_QUANTITY'; end;
        if v_qty <= 0 or v_qty > 1000 then raise exception 'INVALID_ORDER_QUANTITY'; end if;

        select * into v_product from public.products p
        where p.id=(v_item->>'product_id')::uuid and p.is_active=true and p.is_available=true
          and p.approval_status='approved' and p.currency='MAD' for update;
        if not found then raise exception 'PRODUCT_NOT_AVAILABLE:%',v_item->>'product_id'; end if;

        v_variant_id := null;
        if v_item ? 'variant_id' and nullif(trim(v_item->>'variant_id'),'') is not null then
            begin v_variant_id := (v_item->>'variant_id')::uuid; exception when others then raise exception 'INVALID_ORDER_ITEM'; end;
            select * into v_variant from public.product_variants pv
            where pv.id=v_variant_id and pv.product_id=v_product.id and pv.is_active=true and pv.is_available=true for update;
            if not found then raise exception 'PRODUCT_VARIANT_NOT_AVAILABLE:%',v_variant_id; end if;
            if v_variant.stock_quantity < v_qty then raise exception 'INSUFFICIENT_VARIANT_STOCK:%',v_variant.id; end if;
            v_unit_price := v_variant.price_minor;
        else
            if v_product.stock_quantity < v_qty then raise exception 'INSUFFICIENT_STOCK:%',v_product.id; end if;
            v_unit_price := v_product.price_minor;
        end if;

        if not exists (select 1 from public.stores s join public.merchants m on m.id=s.merchant_id
                       where s.id=v_product.store_id and s.is_active=true and s.is_accepting_orders=true and m.status='approved') then
            raise exception 'STORE_NOT_ACCEPTING_ORDERS:%',v_product.store_id;
        end if;

        select so.id,so.subtotal_minor into v_sub_order_id,v_store_subtotal
        from public.sub_orders so where so.master_order_id=v_order.id and so.store_id=v_product.store_id for update;
        if v_sub_order_id is null then
            v_sub_order_number := v_order.order_number || '-' || (select count(*)+1 from public.sub_orders where master_order_id=v_order.id)::text;
            insert into public.sub_orders(master_order_id,store_id,sub_order_number,subtotal_minor,total_minor)
            values(v_order.id,v_product.store_id,v_sub_order_number,0,0)
            returning id,subtotal_minor into v_sub_order_id,v_store_subtotal;
        end if;

        v_line_total := round(v_unit_price*v_qty)::integer;
        v_store_subtotal := coalesce(v_store_subtotal,0)+v_line_total;
        v_subtotal := v_subtotal+v_line_total;
        insert into public.order_items(sub_order_id,product_id,variant_id,product_name_ar,product_name_fr,quantity,unit_price_minor,line_total_minor,notes)
        values(v_sub_order_id,v_product.id,v_variant_id,
               case when v_variant_id is null then v_product.name_ar else v_product.name_ar || ' — ' || v_variant.name_ar end,
               case when v_variant_id is null then v_product.name_fr else v_product.name_fr || ' — ' || v_variant.name_fr end,
               v_qty,v_unit_price,v_line_total,nullif(trim(v_item->>'notes'),''));
        update public.sub_orders set subtotal_minor=v_store_subtotal,total_minor=v_store_subtotal where id=v_sub_order_id;
        if v_variant_id is null then
            update public.products set stock_quantity=stock_quantity-v_qty where id=v_product.id;
        else
            update public.product_variants set stock_quantity=stock_quantity-v_qty where id=v_variant_id;
        end if;
    end loop;

    if v_subtotal < p_discount_minor then raise exception 'DISCOUNT_EXCEEDS_SUBTOTAL'; end if;
    v_total := v_subtotal+p_delivery_fee_minor+p_service_fee_minor+p_tip_minor-p_discount_minor;
    update public.master_orders set subtotal_minor=v_subtotal,delivery_fee_minor=p_delivery_fee_minor,service_fee_minor=p_service_fee_minor,
        tip_minor=p_tip_minor,discount_minor=p_discount_minor,total_minor=v_total where id=v_order.id;
    insert into public.order_status_history(master_order_id,old_status,new_status,changed_by,reason,metadata)
    values(v_order.id,null,'pending',p_customer_id,'order_created',jsonb_build_object('source','api'));
    select * into v_order from public.master_orders where id=v_order.id;
    return jsonb_build_object('replayed',false,'order',to_jsonb(v_order));
exception when unique_violation then
    select id into v_existing_order_id from public.master_orders where customer_id=p_customer_id and idempotency_key=trim(p_idempotency_key) limit 1;
    if v_existing_order_id is not null then
        select to_jsonb(mo) into v_existing from public.master_orders mo where mo.id=v_existing_order_id;
        return jsonb_build_object('replayed',true,'order',v_existing);
    end if;
    raise;
end;
$$;

revoke all on function public.create_master_order(uuid,uuid,text,text,text,jsonb,integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.create_master_order(uuid,uuid,text,text,text,jsonb,integer,integer,integer,integer) to service_role;

commit;