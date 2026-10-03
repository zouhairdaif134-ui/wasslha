import { FormEvent, useEffect, useState } from "react";
import { getAdminDashboardOverview, getAdminSession, type AdminDashboardOverview, type AdminSession } from "./lib/api";
import {
  getCurrentSession,
  signInAdmin,
  signOutAdmin,
  supabase,
  verifyAdminMfa,
} from "./lib/admin-auth";

type NavItem = {
  key: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { key: "overview", label: "نظرة عامة", icon: "⌂" },
  { key: "orders", label: "الطلبات", icon: "▣" },
  { key: "users", label: "المستخدمون", icon: "◉" },
  { key: "merchants", label: "المتاجر", icon: "▤" },
  { key: "riders", label: "السائقون", icon: "◌" },
  { key: "payments", label: "المدفوعات", icon: "₿" },
  { key: "reports", label: "التقارير", icon: "▥" },
  { key: "support", label: "الدعم والشكايات", icon: "?" },
  { key: "settings", label: "الإعدادات", icon: "⚙" },
];

const kpis = [
  { label: "الطلبات اليوم", value: "—", detail: "بانتظار ربط البيانات الحية" },
  { label: "GMV", value: "— MAD", detail: "من قاعدة البيانات" },
  { label: "عمولة WASSLHA", value: "— MAD", detail: "من الـ Ledger" },
  { label: "التوصيلات النشطة", value: "—", detail: "GPS / Dispatch" },
];

function LoginScreen({
  onAuthenticated,
}: {
  onAuthenticated: (session: AdminSession) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishAuthorization() {
    const session = await getCurrentSession();
    if (!session?.access_token) throw new Error("No authenticated session.");
    const adminSession = await getAdminSession(session.access_token);
    onAuthenticated(adminSession);
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signInAdmin(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.mfaRequired && result.factorId) {
      setFactorId(result.factorId);
      setLoading(false);
      return;
    }

    try {
      await finishAuthorization();
    } catch (authorizationError) {
      await signOutAdmin();
      setError(
        authorizationError instanceof Error
          ? authorizationError.message
          : "Admin authorization denied.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitMfa(event: FormEvent) {
    event.preventDefault();
    if (!factorId) return;

    setLoading(true);
    setError(null);
    const result = await verifyAdminMfa(factorId, code.trim());

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    try {
      await finishAuthorization();
    } catch (authorizationError) {
      await signOutAdmin();
      setError(
        authorizationError instanceof Error
          ? authorizationError.message
          : "Admin authorization denied.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" dir="rtl">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">W</div>
          <div>
            <strong>WASSLHA</strong>
            <span>Admin Control Center</span>
          </div>
        </div>

        {!factorId ? (
          <form onSubmit={submitLogin}>
            <span className="section-kicker">SECURE ADMIN ACCESS</span>
            <h1>دخول الإدارة</h1>
            <p className="auth-description">
              الولوج كيتحقق من Supabase Auth، ومن بعد backend كيتأكد من Admin
              role والصلاحية ديال dashboard.
            </p>

            <label>
              Email
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "جارِ التحقق..." : "دخول آمن"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitMfa}>
            <span className="section-kicker">TWO-FACTOR AUTHENTICATION</span>
            <h1>التحقق الثنائي</h1>
            <p className="auth-description">
              دخل الكود ديال TOTP من authenticator المرتبط بحساب Admin.
            </p>

            <label>
              Authentication code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "جارِ التحقق..." : "تأكيد 2FA"}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setFactorId(null);
                setCode("");
                setError(null);
              }}
            >
              رجوع
            </button>
          </form>
        )}

        {!supabase && (
          <div className="auth-warning">
            إعدادات Supabase ناقصة. خاص VITE_SUPABASE_URL و
            VITE_SUPABASE_ANON_KEY فـ environment ديال Admin.
          </div>
        )}
      </section>
    </main>
  );
}

function Dashboard({ adminSession }: { adminSession: AdminSession }) {
  const [active, setActive] = useState("overview");
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"ar" | "fr">("ar");

  const activeLabel =
    navItems.find((item) => item.key === active)?.label ?? "نظرة عامة";

  useEffect(() => {
    if (active !== "overview") return;
    let mounted = true;

    async function loadOverview() {
      setOverviewLoading(true);
      setOverviewError(null);
      try {
        const session = await getCurrentSession();
        if (!session?.access_token) throw new Error("Admin session expired.");
        const data = await getAdminDashboardOverview(session.access_token);
        if (mounted) setOverview(data);
      } catch (error) {
        if (mounted) setOverviewError(error instanceof Error ? error.message : "Unable to load overview.");
      } finally {
        if (mounted) setOverviewLoading(false);
      }
    }

    void loadOverview();
    return () => {
      mounted = false;
    };
  }, [active]);

  function money(minor: number | string) {
    const value = Number(minor);
    return Number.isFinite(value) ? (value / 100).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
  }

  async function logout() {
    await signOutAdmin();
    window.location.reload();
  }

  return (
    <div className="admin-shell" dir={language === "ar" ? "rtl" : "ltr"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <strong>WASSLHA</strong>
            <span>Admin</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Admin navigation">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={active === item.key ? "nav-item active" : "nav-item"}
              onClick={() => setActive(item.key)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{language === "ar" ? item.label : item.key}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>Berrechid MVP</span>
          <span className="status-dot">Authorized Admin</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">WASSLHA CONTROL CENTER</p>
            <h1>{activeLabel}</h1>
          </div>

          <div className="topbar-actions">
            <button
              className="language-button"
              type="button"
              onClick={() => setLanguage(language === "ar" ? "fr" : "ar")}
            >
              {language === "ar" ? "FR" : "AR"}
            </button>
            <div className="admin-user">
              <span className="avatar">A</span>
              <div>
                <strong>{adminSession.user.email ?? "Admin"}</strong>
                <small>{adminSession.roles.map((role) => role.name).join(" · ")}</small>
              </div>
            </div>
            <button className="language-button" type="button" onClick={logout}>
              خروج
            </button>
          </div>
        </header>

        {active === "overview" ? (
          <>
            <section className="welcome-card">
              <div>
                <span className="section-kicker">ADMIN DASHBOARD FOUNDATION</span>
                <h2>مركز التحكم ديال WASSLHA</h2>
                <p>
                  المراقبة والتشغيل ديال الطلبات، المتاجر، السائقين، الأداء المالي
                  والأمن، مع احترام RBAC وRLS والـ Audit Trail.
                </p>
              </div>
              <div className="welcome-badge">Berrechid</div>
            </section>

            <section className="kpi-grid">
              <article className="kpi-card">
                <span>الطلبات اليوم</span>
                <strong>{overviewLoading ? "…" : overview?.today.orders ?? "—"}</strong>
                <small>{overview ? `${overview.today.delivered_orders} توصيلات مكتملة` : "من API v1"}</small>
              </article>
              <article className="kpi-card">
                <span>GMV اليوم</span>
                <strong>{overviewLoading ? "…" : overview ? `${money(overview.today.gmv_minor)} MAD` : "—"}</strong>
                <small>طلبات غير ملغاة / غير مسترجعة</small>
              </article>
              <article className="kpi-card">
                <span>عمولة WASSLHA</span>
                <strong>{overviewLoading ? "…" : overview ? `${money(overview.finance.commission_minor_today)} MAD` : "—"}</strong>
                <small>من الـ financial ledger</small>
              </article>
              <article className="kpi-card">
                <span>التوصيلات النشطة</span>
                <strong>{overviewLoading ? "…" : overview?.operations.active_deliveries ?? "—"}</strong>
                <small>{overview ? `${overview.operations.online_riders} Riders online` : "GPS / Dispatch"}</small>
              </article>
            </section>

            {overviewError && <div className="auth-error overview-error">{overviewError}</div>}

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">OPERATIONS</span>
                    <h3>المراقبة التشغيلية</h3>
                  </div>
                  <span className="panel-state">API v1</span>
                </div>
                <div className="empty-state">
                  <div className="empty-icon">⌁</div>
                  <strong>{overview ? "Operational snapshot" : "البيانات التشغيلية غادي تجي من API"}</strong>
                  {overview ? (
                    <div className="metric-list">
                      <span>Orders active: <b>{overview.operations.active_orders}</b></span>
                      <span>Deliveries active: <b>{overview.operations.active_deliveries}</b></span>
                      <span>Pending merchants: <b>{overview.operations.pending_merchants}</b></span>
                      <span>Failed deliveries today: <b>{overview.operations.failed_deliveries_today}</b></span>
                    </div>
                  ) : (
                    <p>ما كنحطوش أرقام وهمية. كل KPI كيتجاب من backend authoritative.</p>
                  )}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">SECURITY</span>
                    <h3>الأمن والحوكمة</h3>
                  </div>
                  <span className="secure-state">Protected</span>
                </div>
                <ul className="check-list">
                  <li><span>✓</span> Supabase Auth + Admin MFA</li>
                  <li><span>✓</span> Backend Admin authorization</li>
                  <li><span>✓</span> PostgreSQL RLS</li>
                  <li><span>✓</span> Audit Logs append-only</li>
                </ul>
              </article>
            </section>

            <section className="module-grid">
              {[
                ["Orders", "الطلبات والـ State Machine", "orders"],
                ["Merchants", "Approval + Stores + Products", "merchants"],
                ["Riders", "Slots + Dispatch + Earnings", "riders"],
                ["Finance", "Payments + Wallet + Ledger", "payments"],
                ["Support", "Complaints + Refunds + Reviews", "support"],
                ["Settings", "Rules + Fees + Versions", "settings"],
              ].map(([title, description, key]) => (
                <button
                  className="module-card"
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                >
                  <span>{title}</span>
                  <strong>{description}</strong>
                  <small>فتح الوحدة →</small>
                </button>
              ))}
            </section>
          </>
        ) : (
          <>
            <AdminModule module={active} />
            <button className="back-button workspace-back" type="button" onClick={() => setActive("overview")}>
              رجوع للـ Overview
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      const session = await getCurrentSession();
      if (!session?.access_token) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const currentAdmin = await getAdminSession(session.access_token);
        if (mounted) setAdminSession(currentAdmin);
      } catch {
        await signOutAdmin();
        if (mounted) setAdminSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void restore();

    const subscription = supabase?.auth.onAuthStateChange(() => {
      void restore();
    });

    return () => {
      mounted = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <main className="auth-page">
        <section className="loading-card">جارِ التحقق من Admin session...</section>
      </main>
    );
  }

  if (!adminSession) {
    return <LoginScreen onAuthenticated={setAdminSession} />;
  }

  return <Dashboard adminSession={adminSession} />;
}
