import { useMemo, useState } from "react";

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

function App() {
  const [active, setActive] = useState("overview");
  const [language, setLanguage] = useState<"ar" | "fr">("ar");

  const activeLabel = useMemo(
    () => navItems.find((item) => item.key === active)?.label ?? "نظرة عامة",
    [active],
  );

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
          <span className="status-dot">System foundation</span>
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
              aria-label="Change language"
            >
              {language === "ar" ? "FR" : "AR"}
            </button>
            <div className="admin-user">
              <span className="avatar">A</span>
              <div>
                <strong>Admin</strong>
                <small>Authorized account</small>
              </div>
            </div>
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

            <section className="kpi-grid" aria-label="Key performance indicators">
              {kpis.map((kpi) => (
                <article className="kpi-card" key={kpi.label}>
                  <span>{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <small>{kpi.detail}</small>
                </article>
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">OPERATIONS</span>
                    <h3>المراقبة التشغيلية</h3>
                  </div>
                  <span className="panel-state">Ready for API</span>
                </div>
                <div className="empty-state">
                  <div className="empty-icon">⌁</div>
                  <strong>مازال ما كايناش بيانات live</strong>
                  <p>
                    الواجهة واجدة باش تربط مباشرة مع API v1 ديال WASSLHA بلا
                    اختلاق أرقام أو بيانات.
                  </p>
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">SECURITY</span>
                    <h3>الأمن والحوكمة</h3>
                  </div>
                  <span className="secure-state">RLS + Audit</span>
                </div>
                <ul className="check-list">
                  <li><span>✓</span> RBAC وصلاحيات granular</li>
                  <li><span>✓</span> PostgreSQL RLS</li>
                  <li><span>✓</span> Audit Logs append-only</li>
                  <li><span>✓</span> Admin settings history</li>
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
          <section className="module-page">
            <div className="module-page-icon">W</div>
            <span className="section-kicker">ADMIN MODULE</span>
            <h2>{activeLabel}</h2>
            <p>
              هاد الـ module داخل فـ Admin Dashboard architecture. الخطوة
              الموالية هي ربطه بالـ API والـ permissions الخاصة به قبل إظهار
              بيانات حقيقية.
            </p>
            <button className="back-button" type="button" onClick={() => setActive("overview")}>
              رجوع للـ Overview
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
