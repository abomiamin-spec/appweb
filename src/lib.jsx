import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { T } from "./i18n.js";
const X = {
  ar: { add: "إضافة تطبيق", edit: "تعديل", del: "حذف", pub: "منشور", logout: "تسجيل الخروج", saved: "تم الحفظ. سيُعاد نشر الموقع خلال دقائق.", failed: "فشل الحفظ", confirm: "حذف هذا التطبيق؟", err: "تعذّر تحميل البيانات.", retry: "إعادة المحاولة", slug: "المعرّف (إنجليزي صغير)", sizeL: "الحجم", reqL: "المتطلبات (سطر لكل متطلب، عربي | إنجليزي)", logNote: "ملاحظة التحديث (عربي)", logNoteEn: "ملاحظة التحديث (إنجليزي)", cancel: "إلغاء", total: "التطبيقات", feats: "المميزة", unpub: "غير منشور", asAr: "عربي", asEn: "إنجليزي", fSize: "حجم الملف" },
  en: { add: "Add app", edit: "Edit", del: "Delete", pub: "Published", logout: "Sign out", saved: "Saved. The site will redeploy in a few minutes.", failed: "Save failed", confirm: "Delete this app?", err: "Could not load data.", retry: "Retry", slug: "Slug (lowercase)", sizeL: "Size", reqL: "Requirements (one per line, Arabic | English)", logNote: "Update note (Arabic)", logNoteEn: "Update note (English)", cancel: "Cancel", total: "Apps", feats: "Featured", unpub: "Unpublished", asAr: "Arabic", asEn: "English", fSize: "File size" },
};
export const API = import.meta.env.VITE_API_URL || "";
const base = import.meta.env.BASE_URL;
const load = async (f) => { const r = await fetch(`${base}data/${f}.json`, { cache: "no-cache" }); if (!r.ok) throw new Error(f); return r.json(); };
const Ctx = createContext();
export const useApp = () => useContext(Ctx);
const rd = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

export function Provider({ children }) {
  const [lang, setLang] = useState(() => rd("yj-lang", "ar"));
  const [theme, setTheme] = useState(() => rd("yj-theme", ""));
  const [data, setData] = useState({ status: "loading" });
  const [toast, setToast] = useState(null);
  const reload = useCallback(() => {
    setData({ status: "loading" });
    Promise.all(["apps", "categories", "settings"].map(load))
      .then(([apps, categories, settings]) => setData({ status: "ok", apps, categories, settings }))
      .catch(() => setData({ status: "error" }));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const e = document.documentElement; e.lang = lang; e.dir = lang === "ar" ? "rtl" : "ltr";
    if (theme) e.dataset.theme = theme; else delete e.dataset.theme;
  }, [lang, theme]);
  const t = (k) => T[lang][k] ?? X[lang][k] ?? k;
  const L = (o) => (o ? o[lang] || o.ar || "" : "");
  const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-GB", { year: "numeric", month: "short", day: "numeric" });
  const isDark = theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme:dark)").matches;
  const notify = (msg, bad) => { setToast({ msg, bad }); setTimeout(() => setToast(null), 4500); };
  const v = {
    lang, t, L, fmt, data, reload, notify, toast, isDark,
    toggleLang: () => { const n = lang === "ar" ? "en" : "ar"; setLang(n); wr("yj-lang", n); },
    toggleTheme: () => { const n = isDark ? "light" : "dark"; setTheme(n); wr("yj-theme", n); },
    catName: (id) => { const c = data.categories?.find((c) => c.id === id); return c ? L(c) : id; },
  };
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const platsOf = (a) => Object.keys(a.platforms).filter((k) => a.platforms[k].enabled);
const PN = { android: "Android", windows: "Windows", web: "Web" };
export const Icon = ({ app, cls = "" }) => {
  const { L } = useApp();
  if (app.icon) return <div className={`ic has-img ${cls}`}><img src={`${base}${app.icon}`} alt={L(app.name)} loading="lazy" /></div>;
  return <div className={`ic ${cls}`} aria-hidden="true">{(L(app.name).trim()[0] || "?").toUpperCase()}</div>;
};
export const PlatTags = ({ app }) => platsOf(app).map((p) => <span key={p} className="tag">{PN[p]}</span>);
export function Downloads({ app }) {
  const { t } = useApp();
  return platsOf(app).map((p) => {
    const pl = app.platforms[p], u = p === "web" ? pl.url : pl.downloadUrl;
    return u ? <a key={p} className="btn" href={u} rel="noopener noreferrer">{t(p)}</a> : <button key={p} className="btn" disabled title={t("demoN")}>{t(p)}</button>;
  });
}
export function AppCard({ app }) {
  const { t, L, catName } = useApp();
  return (
    <article className="glass card">
      <div className="row"><Icon app={app} /><div><h3>{L(app.name)}</h3><span className="muted">{catName(app.category)} · v{app.version}</span></div></div>
      <p>{L(app.description)}</p>
      <div className="chips">{app.demo && <span className="tag demo">{t("demo")}</span>}<PlatTags app={app} /></div>
      <Link className="btn g" to={`/app/${app.slug}`}>{t("details")}</Link>
    </article>
  );
}
