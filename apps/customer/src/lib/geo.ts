// Free geocoding via OpenStreetMap Nominatim (no API key).
// Usage policy: max 1 request/second, no keystroke-by-keystroke autocomplete -> search only on submit.
// Isolated here so the provider can later be swapped (e.g. Google Places) without touching the UI.

export type Place = { label: string; latitude: number; longitude: number };

export const BERRECHID = { latitude: 33.2655, longitude: -7.5875 };

const BASE = "https://nominatim.openstreetmap.org";
const HEADERS = {
  Accept: "application/json",
  "Accept-Language": "ar,fr;q=0.8",
  "User-Agent": "WASSLHA-customer/0.1 (Berrechid delivery app)",
};

type Hit = { display_name?: string; lat?: string; lon?: string };

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!r.ok) throw new Error(`geo ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchPlaces(q: string): Promise<Place[]> {
  const term = q.trim();
  if (term.length < 3) return [];
  const url = `${BASE}/search?format=jsonv2&limit=6&countrycodes=ma&viewbox=-7.75,33.40,-7.45,33.15&q=${encodeURIComponent(term)}`;
  const rows = (await getJson(url)) as Hit[];
  return (Array.isArray(rows) ? rows : []).flatMap((h) => {
    const latitude = Number(h.lat);
    const longitude = Number(h.lon);
    return h.display_name && Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [{ label: h.display_name, latitude, longitude }]
      : [];
  });
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const d = (await getJson(`${BASE}/reverse?format=jsonv2&zoom=18&lat=${latitude}&lon=${longitude}`)) as Hit;
  return (d?.display_name ?? "").trim();
}
