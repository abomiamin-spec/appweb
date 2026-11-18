import { useEffect, useState } from "react";
import { API, useApp } from "./lib.jsx";

const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ slug: "", name: { ar: "", en: "" }, description: { ar: "", en: "" }, category: "tools", version: "1.0.0", releaseDate: today(), updatedAt: today(), featured: false, published: false, size: "", requirements: { ar: [], en: [] }, platforms: { android: { enabled: false, downloadUrl: "", fileSize: "" }, windows: { enabled: false, downloadUrl: "", fileSize: "" }, web: { enabled: false, url: "" } }, changelog: [] });
const api = (path, init = {}, csrf) => fetch(`${API}${path}`, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(csrf ? { "X-CSRF-Token": csrf } : {}), ...(init.headers || {}) } });

export default function Admin() {
  const { t, data, notify } = useApp();
  const [me, setMe] = useState(API ? "loading" : null);
  useEffect(() => {
    if (!API) return;
    api("/api/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null));
  }, []);
  if (!API) return <section><h2>{t("admin")}</h2><div className="notice"><b>{t("anTitle")}</b><p style={{ margin: "6px 0 0" }}>{t("anBody")}</p></div></section>;
  if (me === "loading") return <div className="sk" />;
  if (!me) return <section><h2>{t("admin")}</h2><a className="btn" href={`${API}/auth/login`}>{t("lg")}</a></section>;
  return <Panel me={me} initial={data.apps} t={t} notify={notify} onOut={() => setMe(null)} />;
}

function Panel({ me, initial, t, notify, onOut }) {
  const { L } = useApp();
  const [apps, setApps] = useState(initial);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function persist(next) {
    setBusy(true);
    try {
      const updates = next.flatMap((a) => a.changelog.map((c) => ({ app: a.slug, ...c })));
      for (const [file, body] of [["apps", next], ["updates", updates]]) {
        const r = await api(`/api/data/${file}`, { method: "PUT", body: JSON.stringify(body) }, me.csrf);
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.status); }
      }
      setApps(next); setForm(null); notify(t("saved"));
    } catch (e) { notify(`${t("failed")}: ${e.message}`, true); }
    setBusy(false);
  }
  const clearFeat = (list, slug) => list.map((a) => (a.slug === slug ? a : { ...a, featured: false }));
  function submit(f, note) {
    let item = { ...f, requirements: f.requirements };
    if (note.ar || note.en) item.changelog = [{ version: f.version, date: f.updatedAt, type: note.type, notes: { ar: note.ar || note.en, en: note.en || note.ar } }, ...f.changelog];
    const exists = apps.some((a) => a.slug === f.slug);
    let next = exists ? apps.map((a) => (a.slug === f.slug ? item : a)) : [item, ...apps];
    if (item.featured) next = clearFeat(next, item.slug);
    persist(next);
  }
  const remove = (a) => { if (confirm(t("confirm"))) persist(apps.filter((x) => x.slug !== a.slug)); };
  const logout = async () => { await api("/auth/logout", { method: "POST" }); onOut(); };

  if (form) return <Form init={form.data} isNew={form.isNew} onSave={submit} onCancel={() => setForm(null)} busy={busy} />;
  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}><h2 style={{ margin: 0 }}>{t("admin")}</h2><span className="muted">@{me.login}</span>
        <div className="chips"><button className="btn" onClick={() => setForm({ data: blank(), isNew: true })}>{t("add")}</button><button className="btn g" onClick={logout}>{t("logout")}</button></div></div>
      <div className="chips" style={{ margin: "16px 0" }}><span className="tag">{t("total")}: {apps.length}</span><span className="tag">{t("feats")}: {apps.filter((a) => a.featured).length}</span><span className="tag">{t("unpub")}: {apps.filter((a) => !a.published).length}</span></div>
      <div className="tl">{apps.map((a) => (
        <div key={a.slug} className="glass row" style={{ flexWrap: "wrap" }}>
          <b style={{ marginInlineEnd: "auto" }}>{L(a.name)} <span className="muted">v{a.version}</span></b>
          {a.published ? <span className="tag">{t("pub")}</span> : <span className="tag demo">{t("unpub")}</span>}
          <button className="btn g" onClick={() => setForm({ data: structuredClone(a), isNew: false })}>{t("edit")}</button>
          <button className="btn g" disabled={busy} onClick={() => remove(a)}>{t("del")}</button>
        </div>))}</div>
    </section>
  );
}

function Form({ init, isNew, onSave, onCancel, busy }) {
  const { t, data, L } = useApp();
  const [f, setF] = useState(init);
  const [note, setNote] = useState({ ar: "", en: "", type: "feature" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setL = (k, l, v) => setF((p) => ({ ...p, [k]: { ...p[k], [l]: v } }));
  const setP = (p, k, v) => setF((s) => ({ ...s, platforms: { ...s.platforms, [p]: { ...s.platforms[p], [k]: v } } }));
  const reqLines = (l) => (f.requirements[l] || []).join("\n");
  const setReq = (l, v) => setF((s) => ({ ...s, requirements: { ...s.requirements, [l]: v.split("\n") } }));
  const clean = () => ({ ...f, requirements: { ar: (f.requirements.ar || []).filter(Boolean), en: (f.requirements.en || []).filter(Boolean) } });
  return (
    <section>
      <form className="glass f" style={{ maxWidth: 720 }} onSubmit={(e) => { e.preventDefault(); onSave(clean(), note); }}>
        <label>{t("slug")}<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" dir="ltr" value={f.slug} disabled={!isNew} onChange={(e) => set("slug", e.target.value)} /></label>
        <div className="two"><label>{t("nAr")}<input required value={f.name.ar} onChange={(e) => setL("name", "ar", e.target.value)} /></label><label>{t("nEn")}<input required dir="ltr" value={f.name.en} onChange={(e) => setL("name", "en", e.target.value)} /></label></div>
        <div className="two"><label>{t("dAr")}<textarea required rows="3" value={f.description.ar} onChange={(e) => setL("description", "ar", e.target.value)} /></label><label>{t("dEn")}<textarea required dir="ltr" rows="3" value={f.description.en} onChange={(e) => setL("description", "en", e.target.value)} /></label></div>
        <div className="two"><label>{t("cat")}<select value={f.category} onChange={(e) => set("category", e.target.value)}>{data.categories.map((c) => <option key={c.id} value={c.id}>{L(c)}</option>)}</select></label>
          <label>{t("ver")}<input required dir="ltr" pattern="\d+\.\d+\.\d+" placeholder="1.0.0" value={f.version} onChange={(e) => set("version", e.target.value)} /></label></div>
        <div className="two"><label>{t("rel")}<input type="date" required value={f.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} /></label><label>{t("upd")}<input type="date" required value={f.updatedAt} onChange={(e) => set("updatedAt", e.target.value)} /></label></div>
        <label>{t("sizeL")}<input dir="ltr" value={f.size} onChange={(e) => set("size", e.target.value)} /></label>
        <div className="two"><label>{t("reqL")} — {t("asAr")}<textarea rows="3" value={reqLines("ar")} onChange={(e) => setReq("ar", e.target.value)} /></label><label>{t("asEn")}<textarea dir="ltr" rows="3" value={reqLines("en")} onChange={(e) => setReq("en", e.target.value)} /></label></div>
        {["android", "windows", "web"].map((p) => (
          <div key={p} className="glass" style={{ padding: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={f.platforms[p].enabled} onChange={(e) => setP(p, "enabled", e.target.checked)} /> {p[0].toUpperCase() + p.slice(1)}</label>
            {f.platforms[p].enabled && (
              <div className="two" style={{ marginTop: 8 }}>
                <label>{t("url")} (https)<input dir="ltr" type="url" pattern="https://.*" placeholder="https://" value={p === "web" ? f.platforms.web.url : f.platforms[p].downloadUrl} onChange={(e) => setP(p, p === "web" ? "url" : "downloadUrl", e.target.value)} /></label>
                {p !== "web" && <label>{t("fSize")}<input dir="ltr" value={f.platforms[p].fileSize} onChange={(e) => setP(p, "fileSize", e.target.value)} /></label>}
              </div>)}
          </div>))}
        <div className="glass" style={{ padding: 12, display: "grid", gap: 8 }}>
          <b>{t("log")}</b>
          <select value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value })}>{["feature", "fix", "release"].map((k) => <option key={k} value={k}>{t("type")[k]}</option>)}</select>
          <label>{t("logNote")}<input value={note.ar} onChange={(e) => setNote({ ...note, ar: e.target.value })} /></label>
          <label>{t("logNoteEn")}<input dir="ltr" value={note.en} onChange={(e) => setNote({ ...note, en: e.target.value })} /></label>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={f.published} onChange={(e) => set("published", e.target.checked)} /> {t("pub")}</label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" style={{ width: "auto" }} checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> {t("feat2")}</label>
        <div className="chips"><button className="btn" disabled={busy}>{t("save")}</button><button type="button" className="btn g" onClick={onCancel}>{t("cancel")}</button></div>
      </form>
    </section>
  );
}
