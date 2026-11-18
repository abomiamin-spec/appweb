import { lazy, Suspense, useState } from "react";
import { NavLink, Link, Route, Routes } from "react-router-dom";
import { Sun, Moon, Menu, Languages } from "lucide-react";
import { useApp } from "./lib.jsx";
import { Home, Apps, Detail, Updates, About, NotFound } from "./pages.jsx";
const Admin = lazy(() => import("./Admin.jsx"));

export default function App() {
  const { t, data, reload, toggleLang, toggleTheme, isDark, toast } = useApp();
  const [open, setOpen] = useState(false);
  const logo = `${import.meta.env.BASE_URL}logo.jpg`;
  return (
    <>
      <header><div className="bar glass">
        <Link className="brand" to="/"><img src={logo} alt={t("name")} /><span>{t("name")}<small>{t("store")}</small></span></Link>
        <nav className={open ? "open" : ""} onClick={() => setOpen(false)}>
          {[["/", "home"], ["/apps", "apps"], ["/updates", "updates"], ["/about", "about"]].map(([to, k]) => <NavLink key={k} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>{t(k)}</NavLink>)}
        </nav>
        <button className="ib" onClick={toggleLang} aria-label="Language"><Languages size={14} /> {t("name") === "ياسر جابر" ? "EN" : "عربي"}</button>
        <button className="ib" onClick={toggleTheme} aria-label="Theme">{isDark ? <Sun size={14} /> : <Moon size={14} />}</button>
        <button className="ib menu" onClick={() => setOpen(!open)} aria-label="Menu"><Menu size={14} /></button>
      </div></header>
      <main className="wrap">
        {data.status === "loading" && <div className="grid" style={{ marginTop: 60 }}>{[0, 1, 2].map((i) => <div key={i} className="sk" />)}</div>}
        {data.status === "error" && <div className="glass empty err" style={{ marginTop: 60 }}>{t("err")}<br /><button className="btn" style={{ marginTop: 12 }} onClick={reload}>{t("retry")}</button></div>}
        {data.status === "ok" && (
          <Suspense fallback={<div className="sk" />}>
            <Routes>
              <Route path="/" element={<Home />} /><Route path="/apps" element={<Apps />} />
              <Route path="/app/:slug" element={<Detail />} /><Route path="/updates" element={<Updates />} />
              <Route path="/about" element={<About />} /><Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        )}
      </main>
      <footer><div className="wrap"><span>{t("rights")}</span><span><Link to="/about">{t("about")}</Link> · <Link to="/admin">{t("admin")}</Link> · v0.1</span></div></footer>
      {toast && <div className={`toast glass ${toast.bad ? "err" : ""}`} role="status">{toast.msg}</div>}
    </>
  );
}
