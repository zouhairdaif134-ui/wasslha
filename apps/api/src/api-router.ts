import { createRequestContext,isAuthenticated } from "./lib/request-context";
import { errorResponse,successResponse } from "./lib/response";
import { getCategories } from "./services/category-service";
import { getProduct,getPublicProduct } from "./services/product-service";
import { getMerchant,getMerchantByOwner,getPublicMerchant } from "./services/merchant-service";
import { getStore,getPublicStore } from "./services/store-service";
import { getCustomerOrders,getOrder,getOrderSubOrders,getOrderStatusHistory } from "./services/order-service";
import { getDeliveryByOrder,getRiderDeliveries,getDeliveryAssignments } from "./services/delivery-service";
import { getRider,getRiderVehicles } from "./services/rider-service";
import { getPaymentByOrder,getCustomerPayments,getPaymentTransactions } from "./services/payment-service";
import { getUserWallet,getWalletTransactions } from "./services/wallet-service";
import { getUserNotifications,markNotificationAsRead } from "./services/notification-service";
import { getOpenRiderSlots,getRiderWaitlist,getRiderAttendance } from "./services/rider-slot-service";
import { getMerchantSettlements,getRiderEarnings,getRiderWithdrawals,getOrderRefunds } from "./services/finance-service";
import { getActivePromotions,getPromoCode,getLoyaltyAccount,getUserReferrals } from "./services/growth-service";
import { getMyTickets,getMyComplaints,getPublishedReviews,getReviewReplies } from "./services/support-service";
import { getMyRequests,getRequest,getRequestItems,getRequestOffers } from "./services/get-request-service";
import { getMessages,getConversations,getNotificationPreferences } from "./services/communication-service";
import { getAuthenticatedSession } from "./services/auth-service";
import { authorize } from "./lib/authorization";
import { PERMISSIONS } from "./lib/permissions";
import { getAdminDashboardOverview } from "./services/admin-dashboard-service";
import { getAdminOrders,getAdminMerchants,getAdminRiders,getAdminFinance,getAdminSupport,getAdminUsers,getAdminAudit } from "./services/admin-operational-service";
import { getMerchantDashboard } from "./services/merchant-dashboard-service";
import { updateRider, createRiderVehicle } from "./services/rider-service";
import { joinSlotWaitlist } from "./services/rider-slot-service";
import { offerDelivery, respondToAssignment } from "./services/dispatch-service";
import { getAdminGovernanceOverview } from "./services/admin-governance-service";

function tokenOf(request:Request){const value=request.headers.get("Authorization")??"";return value.startsWith("Bearer ")?value.slice(7):""}
function ok<T>(data:T,requestId:string){return successResponse(data,{requestId})}
function fail(code:string,message:string,status:number,requestId:string){return errorResponse({code,message,status},requestId)}
function guard(context:Parameters<typeof authorize>[0],permission:Parameters<typeof authorize>[1],requestId:string){const decision=authorize(context,permission);return decision.allowed?null:fail("FORBIDDEN",decision.reason??"Permission denied",403,requestId)}

export async function routeApi(request:Request,env:unknown,requestId:string):Promise<Response>{
 const u=new URL(request.url),publicPath=u.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean),publicMethod=request.method.toUpperCase(),publicToken=tokenOf(request);
 if(publicMethod==="GET"){
  if(publicPath[0]==="categories")return ok(await getCategories(env as any,publicToken),requestId);
  if(publicPath[0]==="products"&&publicPath[1])return ok(await getPublicProduct(publicPath[1],env as any,publicToken),requestId);
  if(publicPath[0]==="stores"&&publicPath[1])return ok(await getPublicStore(publicPath[1],env as any,publicToken),requestId);
  if(publicPath[0]==="merchants"&&publicPath[1])return ok(await getPublicMerchant(publicPath[1],env as any,publicToken),requestId);
  if(publicPath[0]==="promotions")return ok(await getActivePromotions(env as any,publicToken),requestId);
  if(publicPath[0]==="reviews")return ok(await getPublishedReviews(env as any,publicToken,u.searchParams.get("merchant_id")??undefined),requestId);
 }
 const context=await createRequestContext(request,env as Parameters<typeof createRequestContext>[1]);
 if(!isAuthenticated(context))return fail("UNAUTHORIZED",context.error??"Authentication required",401,requestId);
 const token=tokenOf(request),uid=context.user!.id,p=u.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean),m=request.method.toUpperCase(),id=p[1];

 if(p[0]==="admin"&&p[1]==="orders"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_ORDERS_READ,requestId);if(denied)return denied;const result=await getAdminOrders(uid,u.searchParams.get("status"),Number(u.searchParams.get("limit")??50),Number(u.searchParams.get("offset")??0),env as any);if(result.error)return fail("ADMIN_ORDERS_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="admin"&&p[1]==="merchants"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_MERCHANTS_READ,requestId);if(denied)return denied;const result=await getAdminMerchants(uid,u.searchParams.get("status"),Number(u.searchParams.get("limit")??50),Number(u.searchParams.get("offset")??0),env as any);if(result.error)return fail("ADMIN_MERCHANTS_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="admin"&&p[1]==="riders"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_RIDERS_READ,requestId);if(denied)return denied;const result=await getAdminRiders(uid,u.searchParams.get("status"),Number(u.searchParams.get("limit")??50),Number(u.searchParams.get("offset")??0),env as any);if(result.error)return fail("ADMIN_RIDERS_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="admin"&&p[1]==="finance"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_FINANCE_READ,requestId);if(denied)return denied;const result=await getAdminFinance(uid,u.searchParams.get("kind")??"payments",Number(u.searchParams.get("limit")??50),Number(u.searchParams.get("offset")??0),env as any);if(result.error)return fail("ADMIN_FINANCE_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="admin"&&p[1]==="support"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_SUPPORT_READ,requestId);if(denied)return denied;const result=await getAdminSupport(uid,u.searchParams.get("kind")??"tickets",Number(u.searchParams.get("limit")??50),Number(u.searchParams.get("offset")??0),env as any);if(result.error)return fail("ADMIN_SUPPORT_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="admin"&&p[1]==="users"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_USERS_READ,requestId);if(denied)return denied;const result=await getAdminUsers(uid,Number(u.searchParams.get("limit")??50),Number(u.searchParams.get("offset")??0),env as any);if(result.error)return fail("ADMIN_USERS_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="admin"&&p[1]==="audit"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_AUDIT_READ,requestId);if(denied)return denied;const result=await getAdminAudit(uid,Number(u.searchParams.get("limit")??100),Number(u.searchParams.get("offset")??0),env as any);if(result.error)return fail("ADMIN_AUDIT_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="admin"&&p[1]==="governance"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_SETTINGS_READ,requestId);if(denied)return denied;const result=await getAdminGovernanceOverview(uid,env as any);if(result.error)return fail("ADMIN_GOVERNANCE_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="admin"&&p[1]==="overview"&&m==="GET"){const denied=guard(context,PERMISSIONS.ADMIN_DASHBOARD_VIEW,requestId);if(denied)return denied;const result=await getAdminDashboardOverview(uid,env as any);if(result.error)return fail("ADMIN_DASHBOARD_ERROR",result.error,502,requestId);return ok(result.data,requestId)}
 if(p[0]==="auth"&&p[1]==="me"&&m==="GET"){const session=await getAuthenticatedSession(request,env as any);if(!session.success||!session.session)return fail("UNAUTHORIZED",session.error??"Authentication required",401,requestId);return ok({user:session.session.user,roles:session.session.roles,admin:context.roles.some(r=>r.name==="admin")},requestId)}
 try{
  if(p[0]==="categories"&&m==="GET")return ok(await getCategories(env as any,token),requestId);
  if(p[0]==="products"&&m==="GET"&&id){const denied=guard(context,PERMISSIONS.CUSTOMER_APP_ACCESS,requestId);if(denied)return denied;return ok(await getProduct(id,env as any,token),requestId)}
  if(p[0]==="stores"&&m==="GET"&&id){const denied=guard(context,PERMISSIONS.CUSTOMER_APP_ACCESS,requestId);if(denied)return denied;return ok(await getStore(id,env as any,token),requestId)}
  if(p[0]==="merchants"&&m==="GET"&&id){const denied=guard(context,PERMISSIONS.CUSTOMER_APP_ACCESS,requestId);if(denied)return denied;return ok(await getMerchant(id,env as any,token),requestId)}
  if(p[0]==="merchant"&&id==="me"&&p.length===2&&m==="GET"){const denied=guard(context,PERMISSIONS.MERCHANT_PROFILE_READ,requestId);if(denied)return denied;return ok(await getMerchantByOwner(uid,env as any,token),requestId)}
  if(p[0]==="merchant"&&id==="me"&&p[2]==="dashboard"&&m==="GET"){const denied=guard(context,PERMISSIONS.MERCHANT_DASHBOARD_VIEW,requestId);if(denied)return denied;const merchant=await getMerchantByOwner(uid,env as any,token);if(!merchant.data)return fail("MERCHANT_NOT_FOUND","Merchant account not found",404,requestId);const result=await getMerchantDashboard(merchant.data.id,env as any,token);if(!result.success||!result.data)return fail("MERCHANT_DASHBOARD_ERROR",result.error??"Unable to load merchant dashboard",502,requestId);return ok(result.data,requestId)}
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="suborders"){const denied=guard(context,PERMISSIONS.CUSTOMER_ORDERS_READ,requestId);if(denied)return denied;return ok(await getOrderSubOrders(id,env as any,token),requestId)}
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="history"){const denied=guard(context,PERMISSIONS.CUSTOMER_ORDERS_READ,requestId);if(denied)return denied;return ok(await getOrderStatusHistory(id,env as any,token),requestId)}
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="payment"){const denied=guard(context,PERMISSIONS.PAYMENTS_READ,requestId);if(denied)return denied;return ok(await getPaymentByOrder(id,env as any,token),requestId)}
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="delivery"){const denied=guard(context,PERMISSIONS.CUSTOMER_ORDERS_READ,requestId);if(denied)return denied;return ok(await getDeliveryByOrder(id,env as any,token),requestId)}
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="refunds"){const denied=guard(context,PERMISSIONS.CUSTOMER_ORDERS_READ,requestId);if(denied)return denied;return ok(await getOrderRefunds(id,env as any,token),requestId)}
  if(p[0]==="orders"&&m==="GET"&&id){const denied=guard(context,PERMISSIONS.CUSTOMER_ORDERS_READ,requestId);if(denied)return denied;return ok(await getOrder(id,env as any,token),requestId)}
  if(p[0]==="orders"&&m==="GET"){const denied=guard(context,PERMISSIONS.CUSTOMER_ORDERS_READ,requestId);if(denied)return denied;return ok(await getCustomerOrders(uid,env as any,token),requestId)}
  if(p[0]==="deliveries"&&m==="GET"&&id&&p[2]==="assignments"){const denied=guard(context,PERMISSIONS.RIDER_DELIVERIES_READ,requestId);if(denied)return denied;return ok(await getDeliveryAssignments(id,env as any,token),requestId)}
  if(p[0]==="rider"&&id==="me"&&p[2]==="deliveries"&&m==="GET"){const denied=guard(context,PERMISSIONS.RIDER_DELIVERIES_READ,requestId);if(denied)return denied;return ok(await getRiderDeliveries(uid,env as any,token),requestId)}
  if(p[0]==="rider"&&id==="me"&&p[2]==="vehicles"&&m==="GET"){const denied=guard(context,PERMISSIONS.RIDER_PROFILE_READ,requestId);if(denied)return denied;return ok(await getRiderVehicles(uid,env as any,token),requestId)}
  if(p[0]==="rider"&&id==="me"&&p[2]==="waitlist"&&m==="GET"){const denied=guard(context,PERMISSIONS.RIDER_SLOTS_READ,requestId);if(denied)return denied;return ok(await getRiderWaitlist(uid,env as any,token),requestId)}
  if(p[0]==="rider"&&id==="me"&&p[2]==="attendance"&&m==="GET"){const denied=guard(context,PERMISSIONS.RIDER_SLOTS_READ,requestId);if(denied)return denied;return ok(await getRiderAttendance(uid,env as any,token),requestId)}
  if(p[0]==="rider"&&id==="me"&&p[2]==="earnings"&&m==="GET"){const denied=guard(context,PERMISSIONS.WALLET_READ,requestId);if(denied)return denied;return ok(await getRiderEarnings(uid,env as any,token),requestId)}
  if(p[0]==="rider"&&id==="me"&&p[2]==="withdrawals"&&m==="GET"){const denied=guard(context,PERMISSIONS.WALLET_READ,requestId);if(denied)return denied;return ok(await getRiderWithdrawals(uid,env as any,token),requestId)}
  if(p[0]==="rider"&&id==="me"&&m==="GET"){const denied=guard(context,PERMISSIONS.RIDER_PROFILE_READ,requestId);if(denied)return denied;return ok(await getRider(uid,env as any,token),requestId)}
  if(p[0]==="rider-slots"&&m==="GET"){const denied=guard(context,PERMISSIONS.RIDER_SLOTS_READ,requestId);if(denied)return denied;return ok(await getOpenRiderSlots(env as any,token),requestId)}
  if(p[0]==="payments"&&m==="GET"&&id&&p[2]==="transactions"){const denied=guard(context,PERMISSIONS.PAYMENTS_READ,requestId);if(denied)return denied;return ok(await getPaymentTransactions(id,env as any,token),requestId)}
  if(p[0]==="payments"&&m==="GET"){const denied=guard(context,PERMISSIONS.PAYMENTS_READ,requestId);if(denied)return denied;return ok(await getCustomerPayments(uid,env as any,token),requestId)}
  if(p[0]==="wallet"&&id==="me"&&p[2]==="transactions"&&m==="GET"){const denied=guard(context,PERMISSIONS.WALLET_READ,requestId);if(denied)return denied;const wallet=await getUserWallet(uid,env as any,token);if(!wallet.data)return ok([],requestId);return ok(await getWalletTransactions(wallet.data.id,env as any,token),requestId)}
  if(p[0]==="wallet"&&id==="me"&&m==="GET"){const denied=guard(context,PERMISSIONS.WALLET_READ,requestId);if(denied)return denied;return ok(await getUserWallet(uid,env as any,token),requestId)}
  if(p[0]==="notifications"&&m==="PATCH"&&id&&p[2]==="read"){const denied=guard(context,PERMISSIONS.NOTIFICATIONS_READ,requestId);if(denied)return denied;return ok(await markNotificationAsRead(id,uid,env as any,token),requestId)}
  if(p[0]==="notifications"&&m==="GET"){const denied=guard(context,PERMISSIONS.NOTIFICATIONS_READ,requestId);if(denied)return denied;return ok(await getUserNotifications(uid,env as any,token),requestId)}
  if(p[0]==="finance"&&id==="settlements"&&m==="GET"){const denied=guard(context,PERMISSIONS.MERCHANT_PROFILE_READ,requestId);if(denied)return denied;const merchant=await getMerchantByOwner(uid,env as any,token);if(!merchant.data)return ok([],requestId);return ok(await getMerchantSettlements(merchant.data.id,env as any,token),requestId)}
  if(p[0]==="promotions"&&m==="GET")return ok(await getActivePromotions(env as any,token),requestId);
  if(p[0]==="promo-codes"&&m==="GET"&&id){const denied=guard(context,PERMISSIONS.CUSTOMER_APP_ACCESS,requestId);if(denied)return denied;return ok(await getPromoCode(id,env as any,token),requestId)}
  if(p[0]==="loyalty"&&id==="me"&&m==="GET"){const denied=guard(context,PERMISSIONS.CUSTOMER_APP_ACCESS,requestId);if(denied)return denied;return ok(await getLoyaltyAccount(uid,env as any,token),requestId)}
  if(p[0]==="referrals"&&id==="me"&&m==="GET"){const denied=guard(context,PERMISSIONS.CUSTOMER_APP_ACCESS,requestId);if(denied)return denied;return ok(await getUserReferrals(uid,env as any,token),requestId)}
  if(p[0]==="support"&&id==="tickets"&&m==="GET"){const denied=guard(context,PERMISSIONS.SUPPORT_READ,requestId);if(denied)return denied;return ok(await getMyTickets(uid,env as any,token),requestId)}
  if(p[0]==="support"&&id==="complaints"&&m==="GET"){const denied=guard(context,PERMISSIONS.SUPPORT_READ,requestId);if(denied)return denied;return ok(await getMyComplaints(uid,env as any,token),requestId)}
  if(p[0]==="reviews"&&m==="GET"&&id&&p[2]==="replies"){const denied=guard(context,PERMISSIONS.REVIEWS_CREATE,requestId);if(denied)return denied;return ok(await getReviewReplies(id,env as any,token),requestId)}
  if(p[0]==="reviews"&&m==="GET")return ok(await getPublishedReviews(env as any,token,u.searchParams.get("merchant_id")??undefined),requestId);
  if(p[0]==="get-requests"&&m==="GET"&&id&&p[2]==="items"){const denied=guard(context,PERMISSIONS.GET_REQUEST_READ,requestId);if(denied)return denied;return ok(await getRequestItems(id,env as any,token),requestId)}
  if(p[0]==="get-requests"&&m==="GET"&&id&&p[2]==="offers"){const denied=guard(context,PERMISSIONS.GET_REQUEST_READ,requestId);if(denied)return denied;return ok(await getRequestOffers(id,env as any,token),requestId)}
  if(p[0]==="get-requests"&&m==="GET"&&id){const denied=guard(context,PERMISSIONS.GET_REQUEST_READ,requestId);if(denied)return denied;return ok(await getRequest(id,env as any,token),requestId)}
  if(p[0]==="get-requests"&&m==="GET"){const denied=guard(context,PERMISSIONS.GET_REQUEST_READ,requestId);if(denied)return denied;return ok(await getMyRequests(uid,env as any,token),requestId)}
  if(p[0]==="conversations"&&m==="GET"&&id&&p[2]==="messages"){const denied=guard(context,PERMISSIONS.SUPPORT_READ,requestId);if(denied)return denied;return ok(await getMessages(id,env as any,token),requestId)}
  if(p[0]==="conversations"&&m==="GET"){const denied=guard(context,PERMISSIONS.SUPPORT_READ,requestId);if(denied)return denied;return ok(await getConversations(uid,env as any,token),requestId)}
  if(p[0]==="notification-preferences"&&m==="GET"){const denied=guard(context,PERMISSIONS.NOTIFICATIONS_READ,requestId);if(denied)return denied;return ok(await getNotificationPreferences(uid,env as any,token),requestId)}
  return fail("NOT_FOUND","API route not found",404,requestId)
 }catch(error){console.error("API route error",{requestId,error});return fail("INTERNAL_SERVER_ERROR","An unexpected error occurred",500,requestId)}
}
