import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApp, Icon, PlatTags, Downloads, AppCard } from "./lib.jsx";

const published = (d) => d.apps.filter((a) => a.published);
const byDate = (list, k) => [...list].sort((a, b) => b[k].localeCompare(a[k]));

export function AboutBox() {
  const { t, L, data } = useApp();
  return (
    <div className="glass about">
      <img className="portrait" src={`${import.meta.env.BASE_URL}logo.jpg`} alt={t("name")} loading="lazy" />
      <div><h2 style={{ marginBottom: 6 }}>{t("name")}</h2><p className="muted" style={{ fontSize: 16, margin: 0 }}>{L(data.settings.about)}</p></div>
    </div>
  );
}
export function Home() {
  const { t, L, data, catName } = useApp();
  const nav = useNavigate();
  const ps = published(data), f = ps.find((a) => a.featured);
  const submit = (e) => { e.preventDefault(); nav(`/apps?q=${encodeURIComponent(new FormData(e.target).get("q") || "")}`); };
  return (
    <>
      <div className="hero">
        <h1>{t("h1")}</h1><p>{t("sub")}</p>
        <form className="glass search" onSubmit={submit}><input name="q" placeholder={t("ph")} aria-label={t("ph")} /><button className="btn">{t("browse")}</button></form>
        <div className="count">{ps.length} {t("published")}</div>
      </div>
      {f && (
        <section><h2>{t("feat")}</h2>
          <div className="glass feat"><Icon app={f} />
            <div><h3 style={{ fontSize: 28, margin: 0 }}>{L(f.name)}</h3><p className="muted">{L(f.description)}</p>
              <div className="chips" style={{ marginBottom: 14 }}><span className="tag">v{f.version}</span><span className="tag">{catName(f.category)}</span><PlatTags app={f} /></div>
              <div className="chips"><Link className="btn g" to={`/app/${f.slug}`}>{t("details")}</Link><Downloads app={f} /></div></div></div></section>
      )}
      <section><h2>{t("cats")}</h2><div className="chips">{data.categories.map((c) => <Link key={c.id} className="chip" to={`/apps?cat=${c.id}`}>{L(c)}</Link>)}</div></section>
      <section><h2>{t("latest")}</h2><div className="grid">{byDate(ps, "releaseDate").slice(0, 3).map((a) => <AppCard key={a.slug} app={a} />)}</div></section>
      <section><h2>{t("recent")}</h2><div className="grid">{byDate(ps, "updatedAt").slice(0, 3).map((a) => <AppCard key={a.slug} app={a} />)}</div></section>
      <section><AboutBox /></section>
    </>
  );
}
export function Apps() {
  const { t, L, data } = useApp();
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || ""), [cat, setCat] = useState(sp.get("cat") || "all");
  const [plat, setPlat] = useState("all"), [sort, setSort] = useState("new");
  const r = published(data).filter((a) => (cat === "all" || a.category === cat) && (plat === "all" || a.platforms[plat]?.enabled) && (L(a.name) + L(a.description)).toLowerCase().includes(q.toLowerCase()));
  r.sort((a, b) => sort === "az" ? L(a.name).localeCompare(L(b.name)) : sort === "upd" ? b.updatedAt.localeCompare(a.updatedAt) : b.releaseDate.localeCompare(a.releaseDate));
  const Chip = ({ on, set, v, children }) => <button className={`chip ${on === v ? "on" : ""}`} onClick={() => set(v)}>{children}</button>;
  return (
    <section><h2>{t("apps")}</h2>
      <div className="glass search" style={{ marginBottom: 14 }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ph")} aria-label={t("ph")} /></div>
      <div className="chips" style={{ marginBottom: 10 }}><Chip on={cat} set={setCat} v="all">{t("all")}</Chip>{data.categories.map((c) => <Chip key={c.id} on={cat} set={setCat} v={c.id}>{L(c)}</Chip>)}</div>
      <div className="chips" style={{ marginBottom: 10 }}><span className="muted">{t("sys")}:</span><Chip on={plat} set={setPlat} v="all">{t("all")}</Chip>{["android", "windows", "web"].map((p) => <Chip key={p} on={plat} set={setPlat} v={p}>{p[0].toUpperCase() + p.slice(1)}</Chip>)}</div>
      <div className="chips" style={{ marginBottom: 20 }}><span className="muted">{t("sort")}:</span><Chip on={sort} set={setSort} v="new">{t("s_new")}</Chip><Chip on={sort} set={setSort} v="upd">{t("s_upd")}</Chip><Chip on={sort} set={setSort} v="az">{t("s_az")}</Chip>
        <button className="chip" onClick={() => { setQ(""); setCat("all"); setPlat("all"); setSort("new"); }}>{t("clear")}</button></div>
      {r.length ? <div className="grid">{r.map((a) => <AppCard key={a.slug} app={a} />)}</div> : <div className="glass empty">{t("none")}</div>}
    </section>
  );
}
export function Detail() {
  const { slug } = useParams();
  const { t, L, data, fmt, lang, catName } = useApp();
  const a = published(data).find((x) => x.slug === slug);
  if (!a) return <NotFound />;
  const reqs = (a.requirements?.[lang] || a.requirements?.ar || []);
  return (
    <section>
      <Link className="muted" to="/apps">{lang === "ar" ? "→" : "←"} {t("back")}</Link>
      <div className="glass feat" style={{ marginTop: 12 }}><Icon app={a} />
        <div><h1 style={{ fontSize: 34, margin: 0 }}>{L(a.name)}</h1>
          <div className="chips" style={{ margin: "8px 0" }}>{a.demo && <span className="tag demo">{t("demo")}</span>}<span className="tag">{catName(a.category)}</span></div>
          <p className="muted">{L(a.description)}</p><div className="chips"><Downloads app={a} /></div></div></div>
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="glass card"><h3>{t("ver")}</h3><p>v{a.version} · {fmt(a.releaseDate)}<br />{t("upd")}: {fmt(a.updatedAt)}{a.size && <><br />{t("size")}: {a.size}</>}</p></div>
        <div className="glass card"><h3>{t("plat")}</h3><div className="chips"><PlatTags app={a} /></div></div>
        <div className="glass card"><h3>{t("req")}</h3><p>{reqs.map((r, i) => <span key={i}>{r}<br /></span>)}</p></div>
      </div>
      <h2 style={{ marginTop: 32 }}>{t("log")}</h2>
      <div className="tl">{a.changelog.map((c, i) => <div key={i} className="glass"><b>v{c.version}</b> <span className="tag">{t("type")[c.type] || c.type}</span> <span className="muted">{fmt(c.date)}</span><div>{L(c.notes)}</div></div>)}</div>
    </section>
  );
}
export function Updates() {
  const { t, L, data, fmt } = useApp();
  const u = published(data).flatMap((a) => a.changelog.map((c) => ({ a, c }))).sort((x, y) => y.c.date.localeCompare(x.c.date));
  return (
    <section><h2>{t("updates")}</h2>
      {u.length ? <div className="tl">{u.map(({ a, c }, i) => (
        <div key={i} className="glass"><div className="row"><b>{L(a.name)}</b><span className="tag">v{c.version}</span><span className="tag">{t("type")[c.type] || c.type}</span><span className="muted">{fmt(c.date)}</span></div>
          <div>{L(c.notes)}</div><Link className="muted" to={`/app/${a.slug}`}>{t("details")}</Link></div>))}</div> : <div className="glass empty">{t("none")}</div>}
    </section>
  );
}
export function About() {
  const { t, L, data } = useApp();
  const g = data.settings.github;
  return (
    <section><AboutBox />
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="glass card"><h3>{t("vis")}</h3><p>{L(data.settings.vision)}</p></div>
        <div className="glass card"><h3>{t("contact")}</h3><p>{g ? <a href={g} rel="noopener noreferrer">GitHub</a> : "GitHub: —"}</p></div>
      </div>
    </section>
  );
}
export function NotFound() {
  const { t } = useApp();
  return <div className="glass empty" style={{ marginTop: 40 }}>404 — {t("nf")}<br /><Link className="btn" style={{ marginTop: 12 }} to="/">{t("home")}</Link></div>;
}
