# Deploying the JavaOOPQuest backend

The backend compiles and runs student Java code, so it needs a host that
has both Node.js and a JDK. Netlify can't do this — it's static only.

## Option A — Fly.io (recommended, free tier works)

Prereqs: install `flyctl` (`brew install flyctl`), then `fly auth signup`
or `fly auth login`.

This is an npm workspaces monorepo, so the Docker build context is the
**repo root** (the Dockerfile lives in `backend/` but reads root-level
`package.json` and `package-lock.json`). Run `fly deploy` from the repo
root and point it at the backend config:

```bash
# From repo root:

# One-time: create the app using the committed fly.toml.
# If the app name in fly.toml is taken, edit it or pass --name.
fly launch --copy-config --no-deploy --config backend/fly.toml

# Deploy (context is the current directory — repo root)
fly deploy --config backend/fly.toml --dockerfile backend/Dockerfile

# Grab the hostname, e.g. https://javaoopquest-api.fly.dev
fly status --config backend/fly.toml
```

Scale-to-zero is enabled by default (`auto_stop_machines = "stop"`), so
the first request after idle will cold-start in a few seconds. Free tier
limits are plenty for a handful of students.

## Option B — Railway / Render

Both detect the `Dockerfile` automatically.

- **Railway**: `railway init` in `backend/`, then `railway up`. Expose the
  generated URL.
- **Render**: create a new Web Service, point it at this repo, set root
  directory to `backend/`. It picks up the Dockerfile.

Set an env var `PORT=3001` if the platform doesn't auto-bind.

## Wire the frontend to the backend

On Netlify → Site settings → Environment variables, add:

```
VITE_API_BASE=https://<your-backend-host>
```

Trigger a redeploy (or push any change). Vite bakes the value in at build
time, so all `/api/compile` requests go to your backend with proper CORS
(already enabled via `cors()` in `server.ts`).

For local dev nothing changes: the Vite proxy in `vite.config.ts` still
forwards `/api/*` to `localhost:3001`, so `VITE_API_BASE` stays empty.

## Smoke test after deploy

```bash
curl -X POST https://<your-backend-host>/api/compile \
  -H 'Content-Type: application/json' \
  -d '{"code":"System.out.println(\"hi\");"}'
```

Expected:

```json
{"success":true,"output":"hi\n","errors":"","executionTime":...}
```

If you get a timeout, the machine is cold-starting; retry once.
