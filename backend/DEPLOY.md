# Deploying the JavaOOPQuest backend

The backend compiles and runs student Java code, so it needs a host that
has both Node.js and a JDK. Netlify can't do this — it's static only.

Truly-free options (mid-2026):

| Host             | Pros                                            | Cons                                          |
|------------------|-------------------------------------------------|-----------------------------------------------|
| **Render**       | Dashboard UI, auto-deploy from GitHub           | Free tier sleeps after ~15 min; ~30s cold start |
| **Google Cloud Run** | 2M req/mo + 360k GB-s free; fast cold start | Requires `gcloud` CLI setup                   |
| **Oracle Cloud Always-Free** | Real VM, never sleeps, 24 GB RAM    | You install & manage Node/Java/nginx yourself |

The committed `Dockerfile` works on all three.

**Important:** this is an npm workspaces monorepo. Docker build context
is the **repo root**, and the Dockerfile lives in `backend/`. All deploy
commands below assume you are at the repo root.

## Option A — Render (easiest)

1. Push this repo to GitHub (you already have).
2. Go to <https://dashboard.render.com/>, click **New → Web Service**.
3. Connect the repo.
4. Configure:
   - **Root Directory:** leave blank (build from repo root)
   - **Runtime:** Docker
   - **Dockerfile path:** `backend/Dockerfile`
   - **Instance Type:** Free
5. Click **Create Web Service**. First build takes ~5 min.
6. Note the URL, e.g. `https://javaoopquest-api.onrender.com`.

The free tier sleeps after 15 minutes of inactivity. The first request
after a sleep takes ~30 seconds to warm up; subsequent requests are
fast. For a classroom demo this is usually acceptable.

## Option B — Google Cloud Run (fastest cold starts)

Prereqs: `gcloud` CLI installed + logged in, a GCP project with billing
enabled (free tier covers typical usage, no charge unless you exceed it).

```bash
# From the repo root
gcloud run deploy javaoopquest-api \
  --source . \
  --dockerfile backend/Dockerfile \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3001 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 2
```

Cloud Run prints the service URL when done. Cold starts are ~3-5s.

## Option C — Oracle Cloud Always-Free VM

Provision a free ARM VM (Ampere A1), SSH in, then:

```bash
# Install Node + JDK + git
sudo apt update
sudo apt install -y openjdk-21-jdk-headless git nodejs npm nginx
# Clone and build
git clone https://github.com/HebaNAS/JavaOOP.git
cd JavaOOP
npm install
npm run build -w backend
# Run with a process manager
sudo npm install -g pm2
cd backend
pm2 start dist/server.js --name javaoopquest
pm2 save && pm2 startup   # auto-restart on boot
```

Point nginx at `localhost:3001`, open port 443 in the VCN security list,
terminate TLS with Let's Encrypt (`certbot --nginx`). Never sleeps.

## Wire the frontend to the backend

On Netlify → Site settings → Environment variables, add:

```
VITE_API_BASE=https://<your-backend-host>
```

Trigger a redeploy (or push any change). Vite bakes the value in at
build time, so all `/api/compile` requests go to your backend. CORS is
already wide-open in `server.ts`.

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

If you get a timeout on Render, the service is cold-starting; retry once.
