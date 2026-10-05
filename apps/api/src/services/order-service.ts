import { databaseGet, type DatabaseEnv } from "../lib/database";
import { servicePost, type ServiceAuthEnv } from "../lib/service-client";

export interface OrderServiceEnv extends DatabaseEnv, ServiceAuthEnv {}

export interface MasterOrder {
  id: string;
  customer_id: string;
  delivery_address_id: string;
  order_number: string;
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  currency?: string | null;
  subtotal_minor?: number | null;
  delivery_fee_minor?: number | null;
  discount_minor?: number | null;
  total_minor?: number | null;
  service_fee_minor?: number | null;
  tip_minor?: number | null;
  customer_note?: string | null;
  placed_at?: string | null;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubOrder {
  id: string;
  master_order_id: string;
  store_id: string;
  sub_order_number: string;
  status?: string | null;
  subtotal_minor?: number | null;
  discount_minor?: number | null;
  total_minor?: number | null;
  merchant_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  delivery_address_id: string;
  payment_method: "cod" | "online";
  customer_note?: string;
  items: CreateOrderItemInput[];
  delivery_fee_minor?: number;
  service_fee_minor?: number;
  discount_minor?: number;
  tip_minor?: number;
}

export interface OrderServiceResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function createOrder(
  customerId: string,
  input: CreateOrderInput,
  idempotencyKey: string,
  env: OrderServiceEnv,
): Promise<OrderServiceResult<{ replayed: boolean; order: MasterOrder }>> {
  const result = await servicePost<{
    replayed: boolean;
    order: MasterOrder;
  }>(
    "/rest/v1/rpc/create_master_order",
    env,
    {
      p_customer_id: customerId,
      p_delivery_address_id: input.delivery_address_id,
      p_payment_method: input.payment_method,
      p_customer_note: input.customer_note ?? null,
      p_idempotency_key: idempotencyKey,
      p_items: input.items,
      p_delivery_fee_minor: input.delivery_fee_minor ?? 0,
      p_discount_minor: input.discount_minor ?? 0,
      p_service_fee_minor: input.service_fee_minor ?? 0,
      p_tip_minor: input.tip_minor ?? 0,
    },
  );

  return { success: !result.error, data: result.data, error: result.error };
}

export async function getCustomerOrders(customerId:string,env:OrderServiceEnv,accessToken:string):Promise<OrderServiceResult<MasterOrder[]>>{const result=await databaseGet<MasterOrder[]>(`/rest/v1/master_orders?select=*&customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc`,env,accessToken);return{success:!result.error,data:result.data??[],error:result.error};}
export async function getOrder(orderId:string,env:OrderServiceEnv,accessToken:string):Promise<OrderServiceResult<MasterOrder|null>>{const result=await databaseGet<MasterOrder[]>(`/rest/v1/master_orders?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`,env,accessToken);return{success:!result.error,data:result.data?.[0]??null,error:result.error};}
export async function getSubOrder(subOrderId:string,env:OrderServiceEnv,accessToken:string):Promise<OrderServiceResult<SubOrder|null>>{const result=await databaseGet<SubOrder[]>(`/rest/v1/sub_orders?select=*&id=eq.${encodeURIComponent(subOrderId)}&limit=1`,env,accessToken);return{success:!result.error,data:result.data?.[0]??null,error:result.error};}
export async function getSubOrderOwnership(subOrderId:string,env:OrderServiceEnv,accessToken:string):Promise<OrderServiceResult<{id:string;merchant_user_id:string} | null>>{const result=await databaseGet<Array<{id:string;stores:{merchant_id:string;merchants:{user_id:string}}}>>(`/rest/v1/sub_orders?select=id,stores!inner(merchant_id,merchants!inner(user_id))&id=eq.${encodeURIComponent(subOrderId)}&limit=1`,env,accessToken);const row=result.data?.[0];return{success:!result.error,data:row?{id:row.id,merchant_user_id:row.stores.merchants.user_id}:null,error:result.error};}
export async function getSubOrderMasterOrderId(subOrderId:string,env:OrderServiceEnv,accessToken:string):Promise<OrderServiceResult<string|null>>{const result=await databaseGet<Array<{master_order_id:string}>>(`/rest/v1/sub_orders?select=master_order_id&id=eq.${encodeURIComponent(subOrderId)}&limit=1`,env,accessToken);return{success:!result.error,data:result.data?.[0]?.master_order_id??null,error:result.error};}
export async function getSubOrderDeliveryId(subOrderId:string,env:OrderServiceEnv,accessToken:string):Promise<OrderServiceResult<string|null>>{const result=await databaseGet<Array<{master_order_id:string}>>(`/rest/v1/sub_orders?select=master_order_id&id=eq.${encodeURIComponent(subOrderId)}&limit=1`,env,accessToken);const masterOrderId=result.data?.[0]?.master_order_id;if(!masterOrderId)return{success:!result.error,data:null,error:result.error};const delivery=await databaseGet<Array<{id:string}>>(`/rest/v1/deliveries?select=id&master_order_id=eq.${encodeURIComponent(masterOrderId)}&limit=1`,env,accessToken);return{success:!delivery.error,data:delivery.data?.[0]?.id??null,error:delivery.error};}
export async function getOrderSubOrders(orderId:string,env:OrderServiceEnv,accessToken:string):Promise<OrderServiceResult<SubOrder[]>>{const result=await databaseGet<SubOrder[]>(`/rest/v1/sub_orders?select=*&master_order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,env,accessToken);return{success:!result.error,data:result.data??[],error:result.error};}
export async function getOrderStatusHistory(orderId:string,env:OrderServiceEnv,accessToken:string):Promise<OrderServiceResult<Array<Record<string,unknown>>>>{const result=await databaseGet<Array<Record<string,unknown>>>(`/rest/v1/order_status_history?select=*&master_order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc`,env,accessToken);return{success:!result.error,data:result.data??[],error:result.error};}
