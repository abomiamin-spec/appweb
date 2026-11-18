// Yaser Jaber Tech Store — admin backend (Cloudflare Worker)
// Secrets (wrangler secret put): GITHUB_CLIENT_SECRET, SESSION_SECRET, GITHUB_TOKEN
// Vars (wrangler.toml): GITHUB_CLIENT_ID, ADMIN_GITHUB_LOGIN, REPO (owner/name), BRANCH, SITE_ORIGIN
const FILES = ["apps", "updates", "categories", "settings"];
const MAX_BODY = 512 * 1024;
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const rand = () => b64u(crypto.getRandomValues(new Uint8Array(24)));
async function hmac(secret, data) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
async function sign(env, payload) { const p = b64u(enc.encode(JSON.stringify(payload))); return `${p}.${await hmac(env.SESSION_SECRET, p)}`; }
async function verify(env, tok) {
  if (!tok) return null; const [p, s] = tok.split("."); if (!p || !s) return null;
  if ((await hmac(env.SESSION_SECRET, p)) !== s) return null;
  try { const d = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))); return d.exp > Date.now() ? d : null; } catch { return null; }
}
const cookie = (n, v, age) => `${n}=${v}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${age}`;
const getCookie = (req, n) => (req.headers.get("Cookie") || "").split(/;\s*/).map((c) => c.split("=")).find(([k]) => k === n)?.[1];
const cors = (env) => ({ "Access-Control-Allow-Origin": env.SITE_ORIGIN, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token", "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS", Vary: "Origin" });
const json = (env, obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors(env), ...extra } });

const slugOk = (s) => typeof s === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 60;
const urlOk = (u) => u === "" || (typeof u === "string" && /^https:\/\/[^\s]+$/.test(u) && u.length < 500);
const loc = (o) => o && typeof o.ar === "string" && typeof o.en === "string" && o.ar.length < 5000 && o.en.length < 5000;
const day = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
function validate(file, data) {
  if (file === "apps") {
    if (!Array.isArray(data) || data.length > 200) return "apps must be an array";
    const seen = new Set();
    for (const a of data) {
      if (!slugOk(a?.slug) || seen.has(a.slug)) return `invalid or duplicate slug: ${a?.slug}`;
      seen.add(a.slug);
      if (!loc(a.name) || !loc(a.description)) return `${a.slug}: name/description need ar+en`;
      if (!/^\d+\.\d+\.\d+$/.test(a.version || "")) return `${a.slug}: version must be x.y.z`;
      if (!day(a.releaseDate) || !day(a.updatedAt)) return `${a.slug}: bad date`;
      for (const p of ["android", "windows", "web"]) {
        const pl = a.platforms?.[p];
        if (!pl || typeof pl.enabled !== "boolean") return `${a.slug}: platform ${p}`;
        if (!urlOk(pl.downloadUrl ?? pl.url ?? "")) return `${a.slug}: ${p} URL must be https`;
      }
    }
    if (data.filter((a) => a.featured).length > 1) return "only one featured app";
  } else if (file === "categories") {
    if (!Array.isArray(data) || data.some((c) => !slugOk(c.id) || !loc(c))) return "bad categories";
  } else if (file === "updates") {
    if (!Array.isArray(data) || data.some((u) => !slugOk(u.app) || !day(u.date))) return "bad updates";
  } else if (typeof data !== "object" || Array.isArray(data) || data === null) return "must be an object";
  return null;
}

async function gh(env, path, init = {}) {
  return fetch(`https://api.github.com/repos/${env.REPO}/contents/${path}`, { ...init, headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "yj-store-worker", ...(init.headers || {}) } });
}
async function commit(env, file, data, login) {
  const path = `public/data/${file}.json`;
  const cur = await gh(env, `${path}?ref=${env.BRANCH}`);
  if (!cur.ok && cur.status !== 404) throw new Error(`read ${cur.status}`);
  const sha = cur.ok ? (await cur.json()).sha : undefined;
  const text = JSON.stringify(data, null, 2) + "\n";
  const body = { message: `admin: update ${file}.json (by ${login})`, content: btoa(String.fromCharCode(...enc.encode(text))), branch: env.BRANCH, sha };
  const r = await gh(env, path, { method: "PUT", body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`write ${r.status}`);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    try {
      if (url.pathname === "/auth/login") {
        const state = rand();
        const q = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${url.origin}/auth/callback`, scope: "read:user", state });
        return new Response(null, { status: 302, headers: { Location: `https://github.com/login/oauth/authorize?${q}`, "Set-Cookie": cookie("yj_state", state, 600) } });
      }
      if (url.pathname === "/auth/callback") {
        const st = url.searchParams.get("state");
        if (!st || st !== getCookie(req, "yj_state")) return new Response("Invalid state", { status: 400 });
        const tr = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get("code") }) });
        const { access_token } = await tr.json();
        const u = access_token && (await (await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${access_token}`, "User-Agent": "yj-store-worker" } })).json());
        if (!u || u.login?.toLowerCase() !== env.ADMIN_GITHUB_LOGIN.toLowerCase()) { console.log("login denied", u?.login); return new Response("Not authorized", { status: 403 }); }
        const sess = await sign(env, { login: u.login, csrf: rand(), exp: Date.now() + 8 * 3600e3 });
        console.log("login ok", u.login);
        return new Response(null, { status: 302, headers: { Location: `${env.SITE_ORIGIN}${env.SITE_PATH || "/"}#/admin`, "Set-Cookie": cookie("yj_session", sess, 8 * 3600) } });
      }
      if (url.pathname === "/auth/logout" && req.method === "POST") return json(env, { ok: true }, 200, { "Set-Cookie": cookie("yj_session", "", 0) });

      const s = await verify(env, getCookie(req, "yj_session"));
      if (url.pathname === "/api/me") return s ? json(env, { login: s.login, csrf: s.csrf }) : json(env, { error: "unauthenticated" }, 401);
      const m = url.pathname.match(/^\/api\/data\/(\w+)$/);
      if (m && req.method === "PUT") {
        if (!s) return json(env, { error: "unauthenticated" }, 401);
        if (req.headers.get("Origin") !== env.SITE_ORIGIN || req.headers.get("X-CSRF-Token") !== s.csrf) return json(env, { error: "csrf" }, 403);
        if (!FILES.includes(m[1])) return json(env, { error: "unknown file" }, 404);
        const raw = await req.text();
        if (raw.length > MAX_BODY) return json(env, { error: "too large" }, 413);
        let data; try { data = JSON.parse(raw); } catch { return json(env, { error: "invalid JSON" }, 400); }
        const err = validate(m[1], data);
        if (err) return json(env, { error: err }, 422);
        await commit(env, m[1], data, s.login);
        console.log("data updated", m[1], s.login);
        return json(env, { ok: true, note: "Committed. GitHub Actions will redeploy the site." });
      }
      return json(env, { error: "not found" }, 404);
    } catch (e) { console.log("error", e.message); return json(env, { error: "internal error" }, 500); }
  },
};
