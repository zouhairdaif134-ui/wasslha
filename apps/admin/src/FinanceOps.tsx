import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminFinance, type AdminListResult, type AdminSettlementRow } from "./lib/api";
import { getCurrentSession } from "./lib/admin-auth";
import {
  generateSettlements,
  getRiderCash,
  recordCashHandover,
  setSettlementStatus,
  type RiderCashRow,
} from "./lib/finance-ops";

function money(value: number | string): string {
  const n = Number(value);
  return Number.isFinite(n)
    ? (n / 100).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD"
    : "—";
}

/** "125", "125.5", "125,50" -> minor units (12500, 12550, 12550). Null when invalid. */
function toMinor(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, fraction = ""] = s.split(".");
  const minor = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return minor > 0 ? minor : null;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return isoDate(d);
}

const statusLabels: Record<string, string> = {
  pending: "في الانتظار",
  approved: "معتمد",
  paid: "مدفوع",
  cancelled: "ملغى",
};

function Badge({ children, tone }: { children: string; tone: string }) {
  return <span className={"data-badge " + tone}>{children}</span>;
}

async function accessToken(): Promise<string> {
  const session = await getCurrentSession();
  if (!session?.access_token) throw new Error("Admin session expired.");
  return session.access_token;
}

const inputStyle = {
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  font: "inherit",
} as const;

export default function FinanceOps() {
  const [cash, setCash] = useState<RiderCashRow[]>([]);
  const [settlements, setSettlements] = useState<AdminSettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [openRider, setOpenRider] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const handoverKey = useRef<string>("");

  const [periodStart, setPeriodStart] = useState(daysAgo(10));
  const [periodEnd, setPeriodEnd] = useState(daysAgo(3));

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await accessToken();
      const [cashResult, settlementResult] = await Promise.all([
        getRiderCash(token),
        getAdminFinance(token, "settlements"),
      ]);
      setCash(cashResult.items);
      setSettlements((settlementResult as AdminListResult<AdminSettlementRow>).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load finance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openHandover(rider: RiderCashRow) {
    setOpenRider(rider.id);
    setAmount((Number(rider.balance_minor) / 100).toFixed(2));
    setNote("");
    handoverKey.current = crypto.randomUUID();
    setNotice(null);
    setError(null);
  }

  async function submitHandover(rider: RiderCashRow) {
    const minor = toMinor(amount);
    if (minor === null) {
      setError("المبلغ غير صالح. مثال: 250 أو 250.50");
      return;
    }
    if (minor > Number(rider.balance_minor)) {
      setError("المبلغ كبر من الكاش اللي عند السائق.");
      return;
    }
    const label = rider.full_name ?? rider.phone ?? rider.id;
    if (!window.confirm(`تأكيد: استلمتي ${money(minor)} كاش من ${label}؟`)) return;

    setBusy(true);
    setError(null);
    try {
      const result = await recordCashHandover(await accessToken(), rider.id, minor, handoverKey.current, note);
      setNotice(`تسجل التسليم. الكاش عند ${label} دابا ${money(result.balance_after_minor)}.`);
      setOpenRider(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record handover.");
    } finally {
      setBusy(false);
    }
  }

  async function submitGenerate() {
    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      setError("الفترة غير صالحة.");
      return;
    }
    if (!window.confirm(`توليد تسويات التجار من ${periodStart} حتى ${periodEnd}؟`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await generateSettlements(await accessToken(), periodStart, periodEnd);
      setNotice(`تولدات ${result.created} تسوية، وتجاوزنا ${result.skipped} (فارغة أو مولدة من قبل).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate settlements.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(row: AdminSettlementRow, status: "approved" | "paid" | "cancelled") {
    let reference: string | undefined;
    if (status === "paid") {
      const answer = window.prompt(`مرجع التحويل لـ ${row.business_name} (اختياري):`, "");
      if (answer === null) return;
      reference = answer;
      if (!window.confirm(`تأكيد: تخلص ${money(row.net_amount_minor)} لـ ${row.business_name}؟`)) return;
    } else if (status === "cancelled") {
      if (!window.confirm(`إلغاء تسوية ${row.business_name}؟`)) return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await setSettlementStatus(await accessToken(), row.id, status, reference);
      setNotice(`تحدثات الحالة: ${statusLabels[status]}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update settlement.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="module-workspace"><div className="loading-card">جارِ تحميل العمليات المالية...</div></section>;

  return (
    <section className="module-workspace" style={{ marginTop: 24 }}>
      <div className="module-workspace-head">
        <div>
          <span className="section-kicker">FINANCE OPERATIONS · AUDITED</span>
          <h2>كاش السائقين وتسويات التجار</h2>
        </div>
      </div>

      {error && <div className="auth-error overview-error">{error}</div>}
      {notice && <div className="panel" style={{ marginBottom: 12 }}>{notice}</div>}

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>كاش السائقين (COD)</h3>
        <p>
          الكاش اللي قبضو السائقين من الزبناء. ملي كيسلّمو الكاش للإدارة، سجل التسليم هنا باش يتنقص الرصيد
          ويتفتح ليهم الحد من جديد.
        </p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>السائق</th>
                <th>الكاش عندو</th>
                <th>الحد</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cash.map((rider) => (
                <tr key={rider.id}>
                  <td>
                    <b>{rider.full_name ?? "—"}</b>
                    <small>{rider.phone ?? "—"}</small>
                  </td>
                  <td>{money(rider.balance_minor)}</td>
                  <td>{money(rider.limit_minor)}</td>
                  <td>
                    {rider.blocked ? (
                      <Badge tone="blocked">موقوف عن COD</Badge>
                    ) : (
                      <Badge tone="active">عادي</Badge>
                    )}
                  </td>
                  <td>
                    {Number(rider.balance_minor) > 0 && openRider !== rider.id && (
                      <button className="secondary-button" type="button" disabled={busy} onClick={() => openHandover(rider)}>
                        تسليم الكاش
                      </button>
                    )}
                    {openRider === rider.id && (
                      <div style={{ display: "grid", gap: 8, minWidth: 220 }}>
                        <label>
                          المبلغ المستلم (DH)
                          <input
                            style={inputStyle}
                            inputMode="decimal"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                          />
                        </label>
                        <label>
                          ملاحظة (اختياري)
                          <input style={inputStyle} value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="primary-button" type="button" disabled={busy} onClick={() => void submitHandover(rider)}>
                            {busy ? "..." : "تأكيد الاستلام"}
                          </button>
                          <button className="secondary-button" type="button" disabled={busy} onClick={() => setOpenRider(null)}>
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {cash.length === 0 && (
                <tr>
                  <td colSpan={5}>ما كاين حتى سائق دابا.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>تسويات التجار</h3>
        <p>
          كتحسب مبيعات التاجر ناقص العمولة من الـ ledger. الفترة خاصها تكون قديمة بما فيه الكفاية (مدة الأمان).
          كل تسوية: في الانتظار ← معتمد ← مدفوع.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", marginBottom: 16 }}>
          <label>
            من
            <input style={inputStyle} type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </label>
          <label>
            إلى
            <input style={inputStyle} type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </label>
          <button className="primary-button" type="button" disabled={busy} onClick={() => void submitGenerate()}>
            {busy ? "..." : "توليد التسويات"}
          </button>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاجر</th>
                <th>الفترة</th>
                <th>المبيعات</th>
                <th>العمولة</th>
                <th>الصافي</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.business_name}</b></td>
                  <td>{row.period_start} → {row.period_end}</td>
                  <td>{money(row.gross_amount_minor)}</td>
                  <td>{money(row.commission_minor)}</td>
                  <td><b>{money(row.net_amount_minor)}</b></td>
                  <td><Badge tone={row.status}>{statusLabels[row.status] ?? row.status}</Badge></td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {row.status === "pending" && (
                        <button className="secondary-button" type="button" disabled={busy} onClick={() => void changeStatus(row, "approved")}>
                          اعتماد
                        </button>
                      )}
                      {row.status === "approved" && (
                        <button className="primary-button" type="button" disabled={busy} onClick={() => void changeStatus(row, "paid")}>
                          تأكيد الدفع
                        </button>
                      )}
                      {(row.status === "pending" || row.status === "approved") && (
                        <button className="secondary-button" type="button" disabled={busy} onClick={() => void changeStatus(row, "cancelled")}>
                          إلغاء
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={7}>ما كاين حتى تسوية بعد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
