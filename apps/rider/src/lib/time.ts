const pad = (n: number) => String(n).padStart(2, "0");

// Hermes' Intl support differs between devices, so format by hand.
export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
