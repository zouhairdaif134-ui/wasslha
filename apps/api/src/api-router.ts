import { createRequestContext,isAuthenticated } from "./lib/request-context";
import { errorResponse,successResponse } from "./lib/response";
import { getCategories } from "./services/category-service";
import { getProduct } from "./services/product-service";
import { getMerchant,getMerchantByOwner } from "./services/merchant-service";
import { getStore } from "./services/store-service";
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

function tokenOf(request:Request){const value=request.headers.get("Authorization")??"";return value.startsWith("Bearer ")?value.slice(7):""}
function ok<T>(data:T,requestId:string){return successResponse(data,{requestId})}
function fail(code:string,message:string,status:number,requestId:string){return errorResponse({code,message,status},requestId)}

export async function routeApi(request:Request,env:unknown,requestId:string):Promise<Response>{
 const u=new URL(request.url), publicPath=u.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean);
 const publicMethod=request.method.toUpperCase();
 const publicToken=tokenOf(request);
 if(publicMethod==="GET"){
  if(publicPath[0]==="categories")return ok(await getCategories(env as any,publicToken),requestId);
  if(publicPath[0]==="products"&&publicPath[1])return ok(await getProduct(publicPath[1],env as any,publicToken),requestId);
  if(publicPath[0]==="stores"&&publicPath[1])return ok(await getStore(publicPath[1],env as any,publicToken),requestId);
  if(publicPath[0]==="merchants"&&publicPath[1])return ok(await getMerchant(publicPath[1],env as any,publicToken),requestId);
  if(publicPath[0]==="promotions")return ok(await getActivePromotions(env as any,publicToken),requestId);
  if(publicPath[0]==="reviews")return ok(await getPublishedReviews(env as any,publicToken,u.searchParams.get("merchant_id")??undefined),requestId);
 }
 const context=await createRequestContext(request,env as Parameters<typeof createRequestContext>[1]);
 if(!isAuthenticated(context))return fail("UNAUTHORIZED",context.error??"Authentication required",401,requestId);
 const token=tokenOf(request),uid=context.user!.id;
 const p=u.pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean),m=request.method.toUpperCase(),id=p[1];
 try{
  if(p[0]==="categories"&&m==="GET")return ok(await getCategories(env as any,token),requestId);
  if(p[0]==="products"&&m==="GET"&&id)return ok(await getProduct(id,env as any,token),requestId);
  if(p[0]==="stores"&&m==="GET"&&id)return ok(await getStore(id,env as any,token),requestId);
  if(p[0]==="merchants"&&m==="GET"&&id)return ok(await getMerchant(id,env as any,token),requestId);
  if(p[0]==="merchant"&&id==="me"&&m==="GET")return ok(await getMerchantByOwner(uid,env as any,token),requestId);

  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="suborders")return ok(await getOrderSubOrders(id,env as any,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="history")return ok(await getOrderStatusHistory(id,env as any,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="payment")return ok(await getPaymentByOrder(id,env as any,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="delivery")return ok(await getDeliveryByOrder(id,env as any,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="refunds")return ok(await getOrderRefunds(id,env as any,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id)return ok(await getOrder(id,env as any,token),requestId);
  if(p[0]==="orders"&&m==="GET")return ok(await getCustomerOrders(uid,env as any,token),requestId);

  if(p[0]==="deliveries"&&m==="GET"&&id&&p[2]==="assignments")return ok(await getDeliveryAssignments(id,env as any,token),requestId);
  if(p[0]==="rider"&&id==="me"&&p[2]==="deliveries"&&m==="GET")return ok(await getRiderDeliveries(uid,env as any,token),requestId);
  if(p[0]==="rider"&&id==="me"&&p[2]==="vehicles"&&m==="GET")return ok(await getRiderVehicles(uid,env as any,token),requestId);
  if(p[0]==="rider"&&id==="me"&&p[2]==="waitlist"&&m==="GET")return ok(await getRiderWaitlist(uid,env as any,token),requestId);
  if(p[0]==="rider"&&id==="me"&&p[2]==="attendance"&&m==="GET")return ok(await getRiderAttendance(uid,env as any,token),requestId);
  if(p[0]==="rider"&&id==="me"&&p[2]==="earnings"&&m==="GET")return ok(await getRiderEarnings(uid,env as any,token),requestId);
  if(p[0]==="rider"&&id==="me"&&p[2]==="withdrawals"&&m==="GET")return ok(await getRiderWithdrawals(uid,env as any,token),requestId);
  if(p[0]==="rider"&&id==="me"&&m==="GET")return ok(await getRider(uid,env as any,token),requestId);
  if(p[0]==="rider-slots"&&m==="GET")return ok(await getOpenRiderSlots(env as any,token),requestId);

  if(p[0]==="payments"&&m==="GET"&&id&&p[2]==="transactions")return ok(await getPaymentTransactions(id,env as any,token),requestId);
  if(p[0]==="payments"&&m==="GET")return ok(await getCustomerPayments(uid,env as any,token),requestId);
  if(p[0]==="wallet"&&id==="me"&&p[2]==="transactions"&&m==="GET")return ok(await getWalletTransactions(uid,env as any,token),requestId);
  if(p[0]==="wallet"&&id==="me"&&m==="GET")return ok(await getUserWallet(uid,env as any,token),requestId);
  if(p[0]==="notifications"&&m==="PATCH"&&id&&p[2]==="read")return ok(await markNotificationAsRead(id,uid,env as any,token),requestId);
  if(p[0]==="notifications"&&m==="GET")return ok(await getUserNotifications(uid,env as any,token),requestId);

  if(p[0]==="finance"&&id==="settlements"&&m==="GET")return ok(await getMerchantSettlements(uid,env as any,token),requestId);
  if(p[0]==="promotions"&&m==="GET")return ok(await getActivePromotions(env as any,token),requestId);
  if(p[0]==="promo-codes"&&m==="GET"&&id)return ok(await getPromoCode(id,env as any,token),requestId);
  if(p[0]==="loyalty"&&id==="me"&&m==="GET")return ok(await getLoyaltyAccount(uid,env as any,token),requestId);
  if(p[0]==="referrals"&&id==="me"&&m==="GET")return ok(await getUserReferrals(uid,env as any,token),requestId);

  if(p[0]==="support"&&id==="tickets"&&m==="GET")return ok(await getMyTickets(uid,env as any,token),requestId);
  if(p[0]==="support"&&id==="complaints"&&m==="GET")return ok(await getMyComplaints(uid,env as any,token),requestId);
  if(p[0]==="reviews"&&m==="GET"&&id&&p[2]==="replies")return ok(await getReviewReplies(id,env as any,token),requestId);
  if(p[0]==="reviews"&&m==="GET")return ok(await getPublishedReviews(env as any,token,u.searchParams.get("merchant_id")??undefined),requestId);

  if(p[0]==="get-requests"&&m==="GET"&&id&&p[2]==="items")return ok(await getRequestItems(id,env as any,token),requestId);
  if(p[0]==="get-requests"&&m==="GET"&&id&&p[2]==="offers")return ok(await getRequestOffers(id,env as any,token),requestId);
  if(p[0]==="get-requests"&&m==="GET"&&id)return ok(await getRequest(id,env as any,token),requestId);
  if(p[0]==="get-requests"&&m==="GET")return ok(await getMyRequests(uid,env as any,token),requestId);

  if(p[0]==="conversations"&&m==="GET"&&id&&p[2]==="messages")return ok(await getMessages(id,env as any,token),requestId);
  if(p[0]==="conversations"&&m==="GET")return ok(await getConversations(uid,env as any,token),requestId);
  if(p[0]==="notification-preferences"&&m==="GET")return ok(await getNotificationPreferences(uid,env as any,token),requestId);

  return fail("NOT_FOUND","API route not found",404,requestId);
 }catch(error){console.error("API route error",{requestId,error});return fail("INTERNAL_SERVER_ERROR","An unexpected error occurred",500,requestId)}
}
