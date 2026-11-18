# Yaser Jaber | Tech Store

Status: all code written, but NOT yet built or run (no network where it was authored). First run `npm install && npm run dev`, then fix anything that surfaces.
`reference-prototype.html` is the standalone design reference.

Admin: copy `.env.example` to `.env` and set `VITE_API_URL` to your Worker URL (build-time; add it as a repo Actions variable and pass it in deploy.yml `env:` if you build on GitHub).

## Data
`public/data/{apps,updates,categories,settings}.json` — edit or let the admin API commit them.

## Backend setup (Cloudflare Worker)
1. GitHub > Settings > Developer settings > OAuth Apps > New. Callback: `https://<worker-url>/auth/callback`.
2. Create a fine-grained PAT limited to this repo, permission Contents: read/write.
3. Fill the vars in `worker/wrangler.toml`.
4. In `worker/`: `npx wrangler secret put GITHUB_CLIENT_SECRET`, `SESSION_SECRET` (long random), `GITHUB_TOKEN`; then `npx wrangler deploy`.
5. Repo Settings > Pages > Source: GitHub Actions. Push to main to deploy.

## API
GET /auth/login, /auth/callback, POST /auth/logout, GET /api/me, PUT /api/data/:file (needs session cookie, Origin check and X-CSRF-Token).
