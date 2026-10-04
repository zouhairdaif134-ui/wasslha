const base=((import.meta.env.VITE_API_BASE_URL as string|undefined)?.replace(/\/$/,"")??"");
async function get<T>(token:string,path:string):Promise<T>{const r=await fetch(`${base}/api/v1/${path}`,{headers:{Authorization:`Bearer ${token}`,Accept:"application/json"}});const p=await r.json() as {success?:boolean;data?:T;error?:{message?:string}};if(!r.ok||!p.success)throw new Error(p.error?.message??"Request failed.");return p.data as T;}
export type Merchant={id:string;business_name:string;legal_name:string|null;phone:string|null;email:string|null;status:string;rejection_reason:string|null};
export type Store={id:string;name:string;description?:string|null;phone?:string|null;address_text:string;latitude:number|null;longitude:number|null;is_active:boolean;is_accepting_orders:boolean};
export type Product={id:string;store_id:string;name_ar:string;name_fr:string;price_minor:number;currency:string;stock_quantity:number;stock_unit:string;is_available:boolean;is_active:boolean;approval_status:string;rejection_reason:string|null};
export type SubOrder={id:string;master_order_id:string;store_id:string;sub_order_number:string;status:string;subtotal_minor:number;discount_minor:number;total_minor:number;created_at:string;updated_at:string};
export type Settlement={id:string;period_start:string;period_end:string;gross_amount_minor:number|string;commission_minor:number|string;refund_minor:number|string;adjustment_minor:number|string;net_amount_minor:number|string;status:string;paid_at:string|null;created_at:string};
export type Dashboard={stores:Store[];products:Product[];orders:SubOrder[];settlements:Settlement[]};

async function post<T>(token:string,path:string,body:unknown):Promise<T>{const r=await fetch(`${base}/api/v1/${path}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify(body)});const p=await r.json() as {success?:boolean;data?:T;error?:{message?:string}};if(!r.ok||!p.success)throw new Error(p.error?.message??"Request failed.");return p.data as T;}
async function patch<T>(token:string,path:string,body:unknown):Promise<T>{const r=await fetch(`${base}/api/v1/${path}`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify(body)});const p=await r.json() as {success?:boolean;data?:T;error?:{message?:string}};if(!r.ok||!p.success)throw new Error(p.error?.message??"Request failed.");return p.data as T;}
export const getMerchant=(t:string)=>get<Merchant>(t,"merchant/me");
export const getDashboard=(t:string)=>get<Dashboard>(t,"merchant/me/dashboard");

export async function createStore(token:string,input:Omit<Store,"id">){return post<Store>(token,"stores/me",input);}
export async function updateStore(token:string,id:string,input:Partial<Store>){return patch<Store>(token,"stores/"+id,input);}
export async function createProduct(token:string,storeId:string,input:Record<string,unknown>){return post<Product>(token,"products/me?store_id="+encodeURIComponent(storeId),input);}
export async function updateProduct(token:string,id:string,storeId:string,input:Record<string,unknown>){return patch<Product>(token,"products/"+id+"?store_id="+encodeURIComponent(storeId),input);}
export async function getStoreProducts(token:string,storeId:string){return get<Product[]>(token,"products/me?store_id="+encodeURIComponent(storeId));}

export async function updateSubOrderStatus(token:string, subOrderId:string, status:string, reason?:string){
 const r=await fetch(base+"/api/v1/orders/"+subOrderId+"/sub-status",{method:"POST",headers:{Authorization:"Bearer "+token,Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({status,reason})});
 const p=await r.json() as {success?:boolean;data?:unknown;error?:{message?:string}};
 if(!r.ok||!p.success)throw new Error(p.error?.message??"Unable to update order."); return p.data;
}
