import { createRequestContext,isAuthenticated } from "./lib/request-context";
import { errorResponse,successResponse } from "./lib/response";
import { getCategories } from "./services/category-service";
import { getStoreProducts,getProduct } from "./services/product-service";
import { getMerchant,getMerchantByOwner } from "./services/merchant-service";
import { getMerchantStores,getStore } from "./services/store-service";
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

function bearer(request:Request){const v=request.headers.get("Authorization")??"";return v.startsWith("Bearer ")?v.slice(7):""}
export async function routeApi(request:Request,env:any,requestId:string):Promise<Response>{
 const context=await createRequestContext(request,env); const token=bearer(request);
 if(!isAuthenticated(context))return errorResponse({code:"UNAUTHORIZED",message:context.error??"Authentication required"},401,requestId);
 const u=new URL(request.url); const p=u.pathname.replace(/^\/api\/v1\/?/,"").split("/"); const m=request.method.toUpperCase(); const id=p[1];
 const uid=context.user!.id;
 try{
  if(p[0]==="categories"&&m==="GET")return successResponse(await getCategories(env,token),requestId);
  if(p[0]==="products"&&m==="GET"&&id)return successResponse(await getProduct(id,env,token),requestId);
  if(p[0]==="stores"&&m==="GET"&&id)return successResponse(await getStore(id,env,token),requestId);
  if(p[0]==="merchants"&&m==="GET"&&id)return successResponse(await getMerchant(id,env,token),requestId);
  if(p[0]==="merchant"&&p[1]==="me"&&m==="GET")return successResponse(await getMerchantByOwner(uid,env,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&!id)return successResponse(await getCustomerOrders(uid,env,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="suborders")return successResponse(await getOrderSubOrders(id,env,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="history")return successResponse(await getOrderStatusHistory(id,env,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id)return successResponse(await getOrder(id,env,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="payment")return successResponse(await getPaymentByOrder(id,env,token),requestId);
  if(p[0]==="deliveries"&&m==="GET"&&id&&p[2]==="assignments")return successResponse(await getDeliveryAssignments(id,env,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="delivery")return successResponse(await getDeliveryByOrder(id,env,token),requestId);
  if(p[0]==="rider"&&p[1]==="me"&&p[2]==="deliveries"&&m==="GET")return successResponse(await getRiderDeliveries(uid,env,token),requestId);
  if(p[0]==="rider"&&p[1]==="me"&&m==="GET")return successResponse(await getRider(uid,env,token),requestId);
  if(p[0]==="rider"&&p[1]==="me"&&p[2]==="vehicles"&&m==="GET")return successResponse(await getRiderVehicles(uid,env,token),requestId);
  if(p[0]==="payments"&&m==="GET")return successResponse(await getCustomerPayments(uid,env,token),requestId);
  if(p[0]==="payments"&&m==="GET"&&id)return successResponse(await getPaymentTransactions(id,env,token),requestId);
  if(p[0]==="wallet"&&p[1]==="me"&&m==="GET")return successResponse(await getUserWallet(uid,env,token),requestId);
  if(p[0]==="wallet"&&p[1]==="me"&&p[2]==="transactions"&&m==="GET")return successResponse(await getWalletTransactions(uid,env,token),requestId);
  if(p[0]==="notifications"&&m==="GET")return successResponse(await getUserNotifications(uid,env,token),requestId);
  if(p[0]==="notifications"&&m==="PATCH"&&id&&p[2]==="read")return successResponse(await markNotificationAsRead(id,env,token),requestId);
  if(p[0]==="rider-slots"&&m==="GET")return successResponse(await getOpenRiderSlots(env,token),requestId);
  if(p[0]==="rider"&&p[1]==="me"&&p[2]==="waitlist"&&m==="GET")return successResponse(await getRiderWaitlist(uid,env,token),requestId);
  if(p[0]==="rider"&&p[1]==="me"&&p[2]==="attendance"&&m==="GET")return successResponse(await getRiderAttendance(uid,env,token),requestId);
  if(p[0]==="finance"&&p[1]==="settlements"&&m==="GET")return successResponse(await getMerchantSettlements(uid,env,token),requestId);
  if(p[0]==="rider"&&p[1]==="me"&&p[2]==="earnings"&&m==="GET")return successResponse(await getRiderEarnings(uid,env,token),requestId);
  if(p[0]==="rider"&&p[1]==="me"&&p[2]==="withdrawals"&&m==="GET")return successResponse(await getRiderWithdrawals(uid,env,token),requestId);
  if(p[0]==="orders"&&m==="GET"&&id&&p[2]==="refunds")return successResponse(await getOrderRefunds(id,env,token),requestId);
  if(p[0]==="promotions"&&m==="GET")return successResponse(await getActivePromotions(env,token),requestId);
  if(p[0]==="promo-codes"&&m==="GET"&&id)return successResponse(await getPromoCode(id,env,token),requestId);
  if(p[0]==="loyalty"&&p[1]==="me"&&m==="GET")return successResponse(await getLoyaltyAccount(uid,env,token),requestId);
  if(p[0]==="referrals"&&p[1]==="me"&&m==="GET")return successResponse(await getUserReferrals(uid,env,token),requestId);
  if(p[0]==="support"&&p[1]==="tickets"&&m==="GET")return successResponse(await getMyTickets(uid,env,token),requestId);
  if(p[0]==="support"&&p[1]==="complaints"&&m==="GET")return successResponse(await getMyComplaints(uid,env,token),requestId);
  if(p[0]==="reviews"&&m==="GET")return successResponse(await getPublishedReviews(env,token,u.searchParams.get("merchant_id")??undefined),requestId);
  if(p[0]==="reviews"&&m==="GET"&&id&&p[2]==="replies")return successResponse(await getReviewReplies(id,env,token),requestId);
  if(p[0]==="get-requests"&&m==="GET")return successResponse(await getMyRequests(uid,env,token),requestId);
  if(p[0]==="get-requests"&&m==="GET"&&id&&p[2]==="items")return successResponse(await getRequestItems(id,env,token),requestId);
  if(p[0]==="get-requests"&&m==="GET"&&id&&p[2]==="offers")return successResponse(await getRequestOffers(id,env,token),requestId);
  if(p[0]==="get-requests"&&m==="GET"&&id)return successResponse(await getRequest(id,env,token),requestId);
  return errorResponse({code:"NOT_FOUND",message:"API route not found"},404,requestId);
 }catch(error){console.error("API route error",{requestId,error});return errorResponse({code:"INTERNAL_SERVER_ERROR",message:"An unexpected error occurred"},500,requestId)}
}
