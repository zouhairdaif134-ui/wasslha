import type { ServiceAuthEnv } from "../lib/service-client";

export interface MapsServiceEnv extends ServiceAuthEnv { GOOGLE_MAPS_API_KEY?: string }
export interface RouteResult { distance_meters:number; duration_seconds:number; polyline?:string|null }
export interface GeocodeResult { address:string; latitude:number; longitude:number }
export async function calculateRoute(origin:{latitude:number;longitude:number},destination:{latitude:number;longitude:number},env:MapsServiceEnv):Promise<{success:boolean;data:RouteResult|null;error:string|null}>{
 if(!env.GOOGLE_MAPS_API_KEY)return {success:false,data:null,error:"Google Maps is not configured"};
 const params=new URLSearchParams({origin:`${origin.latitude},${origin.longitude}`,destination:`${destination.latitude},${destination.longitude}`,key:env.GOOGLE_MAPS_API_KEY});
 const r=await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
 if(!r.ok)return {success:false,data:null,error:"Maps route request failed"};
 const body=await r.json() as {status:string;routes?:Array<{overview_polyline?:{points?:string};legs?:Array<{distance?:{value?:number};duration?:{value?:number}}>}>};
 if(body.status!=="OK"||!body.routes?.[0]?.legs?.[0])return {success:false,data:null,error:`Maps route unavailable: ${body.status}`};
 const leg=body.routes[0].legs[0];
 return {success:true,data:{distance_meters:leg.distance?.value??0,duration_seconds:leg.duration?.value??0,polyline:body.routes[0].overview_polyline?.points??null},error:null};
}
export async function geocodeAddress(address:string,env:MapsServiceEnv):Promise<{success:boolean;data:GeocodeResult|null;error:string|null}>{
 if(!env.GOOGLE_MAPS_API_KEY)return {success:false,data:null,error:"Google Maps is not configured"};
 const params=new URLSearchParams({address:`${address}, Berrechid, Morocco`,key:env.GOOGLE_MAPS_API_KEY});
 const r=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
 if(!r.ok)return {success:false,data:null,error:"Maps geocoding request failed"};
 const body=await r.json() as {status:string;results?:Array<{formatted_address:string;geometry?:{location?:{lat:number;lng:number}}}>};
 const loc=body.results?.[0]?.geometry?.location;
 if(body.status!=="OK"||!loc)return {success:false,data:null,error:`Address not found: ${body.status}`};
 return {success:true,data:{address:body.results![0].formatted_address,latitude:loc.lat,longitude:loc.lng},error:null};
}
