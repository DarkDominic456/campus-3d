# Campus 3D presence server

A tiny WebSocket relay that lets visitors see each other on the campus: positions, animations,
chat, emotes and (opt-in) profile cards. It keeps no data — only who is connected right now —
and validates, clamps and rate-limits everything clients send.

## Run locally

```bash
npm run server                          # from the repo root → ws://localhost:8787
```

Then start the site with the URL (create `.env.local` in the repo root):

```
VITE_MULTIPLAYER_URL=ws://localhost:8787
```

Without `VITE_MULTIPLAYER_URL`, the dev server falls back to **local mode**: tabs of the same
browser see each other (BroadcastChannel), handy for trying it without a server. Production
builds without a URL hide multiplayer completely.

## Deploy

Any Node host that keeps WebSocket connections open works (Vercel serverless functions don't).
For example on **Render** (free web service):

1. New → Web Service → connect the GitHub repo.
2. Root directory: `server` · Build command: `npm install` · Start command: `npm start`.
3. Environment: `ALLOWED_ORIGINS=https://<your-site>.vercel.app` (comma-separate several).
4. Copy the service URL, change `https://` to `wss://`, and set it as
   `VITE_MULTIPLAYER_URL` in the Vercel project's environment variables. Redeploy the site.

Other hosts (Fly.io, Railway, a VPS) work the same way: run `npm start` in this folder with
`PORT` set by the host. `GET /` returns `{ ok, online }` for health checks.

| Env var | Default | Meaning |
|---|---|---|
| `PORT` | 8787 | HTTP / WebSocket port |
| `ALLOWED_ORIGINS` | (any) | page origins allowed to connect — **set this in production** |
| `MAX_PER_ROOM` | 60 | visitors per room |

Free hosts usually sleep when idle; the first visitor may wait a few seconds while it wakes up
(the site keeps retrying in the background).
