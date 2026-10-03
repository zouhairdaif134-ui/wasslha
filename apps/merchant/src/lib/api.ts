const base=((import.meta.env.VITE_API_BASE_URL as string|undefined)?.replace(/\/$/,"")??"");
async function get<T>(token:string,path:string):Promise<T>{const r=await fetch(`${base}/api/v1/${path}`,{headers:{Authorization:`Bearer ${token}`,Accept:"application/json"}});const p=await r.json() as {success?:boolean;data?:T;error?:{message?:string}};if(!r.ok||!p.success)throw new Error(p.error?.message??"Request failed.");return p.data as T;}
export type Merchant={id:string;business_name:string;legal_name:string|null;phone:string|null;email:string|null;status:string;rejection_reason:string|null};
export type Store={id:string;name:string;description?:string|null;phone?:string|null;address_text:string;latitude:number|null;longitude:number|null;is_active:boolean;is_accepting_orders:boolean};
export type Product={id:string;store_id:string;name_ar:string;name_fr:string;price_minor:number;currency:string;stock_quantity:number;stock_unit:string;is_available:boolean;is_active:boolean;approval_status:string;rejection_reason:string|null};
export type SubOrder={id:string;master_order_id:string;store_id:string;sub_order_number:string;status:string;subtotal_minor:number;discount_minor:number;total_minor:number;created_at:string;updated_at:string};
export type Settlement={id:string;period_start:string;period_end:string;gross_amount_minor:number|string;commission_minor:number|string;refund_minor:number|string;adjustment_minor:number|string;net_amount_minor:number|string;status:string;paid_at:string|null;created_at:string};
export type Dashboard={stores:Store[];products:Product[];orders:SubOrder[];settlements:Settlement[]};
export const getMerchant=(t:string)=>get<Merchant>(t,"merchant/me");
export const getDashboard=(t:string)=>get<Dashboard>(t,"merchant/me/dashboard");
