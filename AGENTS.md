# AGENTS.md

Honeycomb Content Planner. Internal content tracker and planner for HoneyComb Inc.,
modelled on the team's real workflow: senior brief, task assigned to a Creative,
Google Drive delivery, Social Media Manager captions and posts.

Lead developer and designer: Rifat Newaj Razin.

## Stack and layout

- Hand-written static frontend: `index.html`, `app.js`, `style.css`.
- `server.mjs` : small Node WebSocket server for real-time updates (`npm start`).
- Optional Firestore / Supabase sync, with an offline fallback if the backend is
  unreachable.
- `build.mjs` (`npm run build`) produces the deployed artefacts:
  - `app.min.js`, `style.min.css` : minified sources
  - `assets/vendor/supabase-js.min.js` : bundled, version-pinned Supabase client
- `scripts/convert-images.mjs` (`npm run images`) : image conversion.
- Deploy target: Vercel (`vercel.json`). Also reachable through the personal site at
  `rifatnewajrazin.com/honeycomb-content-planner` via a rewrite in that repo.
- Supabase SQL lives in `supabase_migration.sql` and `supabase_data_restore.sql`.

## Rules

- Edit the sources (`app.js`, `style.css`), never the generated `*.min.*` files or
  `assets/vendor/*` directly. After a source change, run `npm run build` and bump the
  `?v=` query strings in `index.html` so caches invalidate (the min files are served
  `immutable`).
- Keep the offline fallback working. A backend outage must not break the app.
- Never commit Supabase keys, Firebase config secrets, or service credentials. Use
  environment variables and reference them by name.
- Sign-in is deliberately restricted to the team members with active accounts. Do not
  widen access without being asked.
- `scratch/`, `node_modules/`, and `assets/_originals/` are gitignored. Do not add them.
- This repo currently lives under a Gemini/Antigravity scratch directory. Treat the
  GitHub remote as the real home; do not rely on the local path being permanent.

## Run locally

```bash
npm install
npm start   # node server.mjs, then open http://localhost:8000/
```
