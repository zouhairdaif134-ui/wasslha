import { useEffect, useState, type ReactNode } from "react";
import {
  getAdminAudit,getAdminFinance,getAdminMerchants,getAdminOrders,getAdminRiders,getAdminSupport,getAdminUsers,
  type AdminAuditRow,type AdminComplaintRow,type AdminLedgerRow,type AdminMerchantRow,type AdminOrderRow,
  type AdminPaymentRow,type AdminRiderRow,type AdminSettlementRow,type AdminTicketRow,type AdminUserRow
} from "./lib/api";
import { getCurrentSession } from "./lib/admin-auth";

type Props={module:string};

function money(v:number|string){const n=Number(v);return Number.isFinite(n)?(n/100).toLocaleString("fr-MA",{minimumFractionDigits:2,maximumFractionDigits:2})+" MAD":"—";}
function date(v:string|null){return v?new Date(v).toLocaleString("fr-MA",{dateStyle:"short",timeStyle:"short"}):"—";}
function Badge({children}:{children:string}){return <span className={"data-badge "+children.toLowerCase().replace(/[^a-z0-9]+/g,"-")}>{children}</span>;}
function Table({headers,children}:{headers:string[];children:ReactNode}){return <div className="data-table-wrap"><table className="data-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;}
function ErrorBox({message}:{message:string}){return <div className="auth-error overview-error">{message}</div>;}

export default function AdminModule({module}:Props){
 const [data,setData]=useState<unknown>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{let alive=true; (async()=>{try{setLoading(true);const s=await getCurrentSession();if(!s?.access_token)throw new Error("Admin session expired.");
 let d:unknown;
 if(module==="orders")d=await getAdminOrders(s.access_token);
 else if(module==="merchants")d=await getAdminMerchants(s.access_token);
 else if(module==="riders")d=await getAdminRiders(s.access_token);
 else if(module==="payments")d=await getAdminFinance(s.access_token,"payments");
 else if(module==="reports")d=await getAdminFinance(s.access_token,"ledger");
 else if(module==="support")d=await getAdminSupport(s.access_token,"tickets");
 else if(module==="users")d=await getAdminUsers(s.access_token);
 else if(module==="settings")d=await getAdminAudit(s.access_token);
 else d={items:[],total:0};
 if(alive)setData(d);
 }catch(e){if(alive)setError(e instanceof Error?e.message:"Unable to load module.");}finally{if(alive)setLoading(false);}})();return()=>{alive=false}},[module]);
 if(loading)return <section className="module-page"><div className="loading-card">جارِ تحميل البيانات...</div></section>;
 if(error)return <section className="module-page"><ErrorBox message={error}/></section>;
 const rows=(data as {items:unknown[];total:number})?.items??[];
 const total=(data as {items:unknown[];total:number})?.total??0;
 if(module==="orders")return <section className="module-workspace"><ModuleHead title="الطلبات" total={total}/><Table headers={["الطلب","الزبون","الحالة","الدفع","المجموع","التاريخ"]}>{(rows as AdminOrderRow[]).map(r=><tr key={r.id}><td><b>{r.order_number}</b></td><td>{r.customer_name??"—"}<small>{r.customer_phone}</small></td><td><Badge>{r.status}</Badge></td><td>{r.payment_method} · {r.payment_status}</td><td>{money(r.total_minor)}</td><td>{date(r.created_at)}</td></tr>)}</Table></section>;
 if(module==="merchants")return <section className="module-workspace"><ModuleHead title="المتاجر" total={total}/><Table headers={["النشاط","المالك","الحالة","المتاجر","الهاتف","التاريخ"]}>{(rows as AdminMerchantRow[]).map(r=><tr key={r.id}><td><b>{r.business_name}</b><small>{r.email??"—"}</small></td><td>{r.owner_name??"—"}</td><td><Badge>{r.status}</Badge></td><td>{r.store_count}</td><td>{r.phone??r.owner_phone??"—"}</td><td>{date(r.created_at)}</td></tr>)}</Table></section>;
 if(module==="riders")return <section className="module-workspace"><ModuleHead title="السائقون" total={total}/><Table headers={["السائق","الحالة","Online","المركبة","مخالفات مفتوحة","أرباح معلقة"]}>{(rows as AdminRiderRow[]).map(r=><tr key={r.id}><td><b>{r.full_name??"—"}</b><small>{r.phone??"—"}</small></td><td><Badge>{r.status}</Badge></td><td>{r.is_online?"Online":"Offline"}</td><td>{r.vehicle_type??"—"} {r.vehicle_plate??""}</td><td>{r.open_violations}</td><td>{r.pending_earnings}</td></tr>)}</Table></section>;
 if(module==="payments")return <section className="module-workspace"><ModuleHead title="المدفوعات" total={total}/><Table headers={["الطلب","الزبون","الطريقة","الحالة","المبلغ","التاريخ"]}>{(rows as AdminPaymentRow[]).map(r=><tr key={r.id}><td>{r.order_number}</td><td>{r.customer_name??"—"}</td><td>{r.payment_method}</td><td><Badge>{r.status}</Badge></td><td>{money(r.amount_minor)}</td><td>{date(r.created_at)}</td></tr>)}</Table></section>;
 if(module==="reports")return <section className="module-workspace"><ModuleHead title="Financial Ledger" total={total}/><Table headers={["Type","Direction","Amount","Order","Reference","Date"]}>{(rows as AdminLedgerRow[]).map(r=><tr key={r.id}><td>{r.entry_type}</td><td><Badge>{r.direction}</Badge></td><td>{money(r.amount_minor)}</td><td>{r.master_order_id??"—"}</td><td>{r.reference_type??"—"}</td><td>{date(r.created_at)}</td></tr>)}</Table></section>;
 if(module==="support")return <section className="module-workspace"><ModuleHead title="الدعم والشكايات" total={total}/><Table headers={["الموضوع","الزبون","الأولوية","الحالة","الطلب","التاريخ"]}>{(rows as AdminTicketRow[]).map(r=><tr key={r.id}><td><b>{r.subject}</b><small>{r.category}</small></td><td>{r.user_name??"—"}</td><td><Badge>{r.priority}</Badge></td><td><Badge>{r.status}</Badge></td><td>{r.order_number??"—"}</td><td>{date(r.created_at)}</td></tr>)}</Table></section>;
 if(module==="users")return <section className="module-workspace"><ModuleHead title="المستخدمون" total={total}/><Table headers={["المستخدم","الهاتف","الأدوار","اللغة","الحالة","التاريخ"]}>{(rows as AdminUserRow[]).map(r=><tr key={r.id}><td><b>{r.full_name??"—"}</b><small>{r.id}</small></td><td>{r.phone??"—"}</td><td>{r.roles.map(x=>x.name).join(" · ")}</td><td>{r.preferred_language}</td><td>{r.is_active?"Active":"Disabled"}</td><td>{date(r.created_at)}</td></tr>)}</Table></section>;
 return <section className="module-workspace"><ModuleHead title="Audit Log" total={total}/><Table headers={["Actor","Action","Entity","IP","Date"]}>{(rows as AdminAuditRow[]).map(r=><tr key={r.id}><td>{r.actor_name??"System"}</td><td><b>{r.action}</b></td><td>{r.entity_type} {r.entity_id??""}</td><td>{r.ip_address??"—"}</td><td>{date(r.created_at)}</td></tr>)}</Table></section>;
}
function ModuleHead({title,total}:{title:string;total:number}){return <div className="module-workspace-head"><div><span className="section-kicker">LIVE DATA · API v1</span><h2>{title}</h2></div><strong>{total.toLocaleString()} records</strong></div>}
