import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import type { Pos } from "../lib/types";

// Free map (Leaflet + OpenStreetMap inside a WebView): no API key, no billing.
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>html,body,#m{height:100%;margin:0;background:#eceff1}</style></head>
<body><div id="m"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
var map=L.map('m',{zoomControl:false}).setView([33.2655,-7.5875],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var layers={};
function icon(e){return L.divIcon({html:'<div style="font-size:28px;line-height:28px">'+e+'</div>',className:'',iconSize:[28,28],iconAnchor:[14,14]});}
function put(k,p,e){if(layers[k]){map.removeLayer(layers[k]);delete layers[k];}if(p){layers[k]=L.marker([p.latitude,p.longitude],{icon:icon(e)}).addTo(map);}}
window.setPoints=function(d){
  put('r',d.rider,'🛵');put('p',d.pickup,'🏪');put('c',d.customer,'🏠');
  var pts=[];['rider','pickup','customer'].forEach(function(k){if(d[k])pts.push([d[k].latitude,d[k].longitude]);});
  if(pts.length===1)map.setView(pts[0],16);else if(pts.length>1)map.fitBounds(pts,{padding:[40,40],maxZoom:17});
};
window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;

export function LiveMap({ rider, pickup, customer, height = 210 }: { rider: Pos | null; pickup: Pos | null; customer: Pos | null; height?: number }) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const payload = useMemo(() => JSON.stringify({ rider, pickup, customer }), [rider, pickup, customer]);

  function push() {
    web.current?.injectJavaScript(`window.setPoints(${payload});true;`);
  }
  useEffect(() => { if (ready.current) push(); }, [payload]);

  return (
    <View style={{ height, borderRadius: 16, overflow: "hidden" }}>
      <WebView
        ref={web}
        originWhitelist={["*"]}
        javaScriptEnabled
        source={{ html: HTML, baseUrl: "https://wasslha-api.berrchidcity99.workers.dev" }}
        onMessage={(e) => { if (e.nativeEvent.data === "ready") { ready.current = true; push(); } }}
        style={{ flex: 1 }}
      />
    </View>
  );
}
