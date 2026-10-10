# FORGE PORTFOLIO BUILDER — Deployment Guide

Complete deployment instructions for the Forge Portfolio Builder using **free-tier** options.

## 🏗️ Architecture Overview

```
Frontend (Vercel/Render Static Site)  →  Backend API (Render)  →  Neon PostgreSQL
                                            ↓
                                   Trigger.dev (Background Tasks)
                                            ↓
                                   NVIDIA NIM (AI Models)
```

---

## 📋 Prerequisites

- GitHub account (for Vercel & Render Git integration)
- NVIDIA API key (free tier: `nvapi-...` key from [build.nvidia.com](https://build.nvidia.com))
- Neon account (free tier PostgreSQL)
- Node.js 18+ (Node 22 is recommended for this repository)
- Java 11+ wherever the backend processes resumes (`@opendataloader/pdf` launches Java)

---

## 1️⃣ Database — Neon PostgreSQL (Free)

1. Go to [neon.tech](https://neon.tech) → Sign up
2. Create a new project → Choose Free tier
3. Copy the **Connection String** from the dashboard
4. Set the following env vars later (in Vercel/Render):
   - `DATABASE_URL` — full connection string
   - `DIRECT_DATABASE_URL` — direct connection (no pooler)

### Run Prisma Migrations

Locally (one-time):

```bash
cd backend
npx prisma migrate dev --name init
```

For production, run the migration before the first backend request. On a free
Render Web Service, use the migration in the Render build command shown below
because Render's Pre-Deploy Command is not available on the Free plan:

```bash
cd backend
npx prisma migrate deploy
```

---

## 2️⃣ NVIDIA API Key

1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Create an API key (free tier available)
3. The key format is `nvapi-...`
4. Set it as `NVIDIA_API_KEY` for the diagnostic script and as
   `OPENROUTER_API_KEY` for the backend/Trigger.dev runtime, which uses the
   OpenAI-compatible NVIDIA endpoint configured in `src/tools/langchain.ts`

### Current Model Configuration

All stages use the same free NVIDIA NIM model:

```
nvidia/nemotron-3-super-120b-a12b:free
```

Configured in `backend/.env`:
```
ARCHITECT_MODEL=nvidia/nemotron-3-super-120b-a12b:free
BLUEPRINT_MODEL=nvidia/nemotron-3-super-120b-a12b:free
CODE_MODEL=nvidia/nemotron-3-super-120b-a12b:free
RESUME_MODEL=nvidia/nemotron-3-super-120b-a12b:free
```

---

## 3️⃣ Backend — Render Web Service (deploy this first)

Deploy the backend before creating the frontend deployment. The backend URL is
needed by the frontend, and the final frontend URL is needed by the backend's
`FRONTEND_ORIGIN` CORS setting.

### A. Prepare and verify locally

Run these commands from the repository root before opening Render:

```bash
# Install the exact locked dependency tree and generate the Prisma client
cd backend
npm ci
npx prisma generate

# Apply the production migration only if DATABASE_URL points at the intended
# database, then compile the TypeScript backend.
# npx prisma migrate deploy
npm run build

# Start the same process Render will start
npm start
```

`npm ci` also runs this repository's `postinstall` script, which runs
`prisma generate`; the explicit command above makes that requirement visible.
`npm run build` must finish with no TypeScript errors before deployment. The
current source must be corrected if this command fails; Render stops at the
build step and never starts the service.

The backend listens on `process.env.PORT` and defaults to `3001` locally. Do
not hard-code `PORT=3001` in Render; Render supplies the port automatically.

### B. Create the Render service

1. Push the repository to GitHub.
2. Open [render.com](https://render.com) → **New** → **Web Service**.
3. Connect the GitHub repository and select the branch to deploy.
4. Use these settings:

   | Render setting | Value |
   |---|---|
   | Runtime | `Docker` (recommended; Node is valid only when Java 11+ is available) |
   | Root Directory | `backend` |
   | Build Command | `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build` |
   | Start Command | `npm start` |
   | Instance Type | `Free` for testing/low traffic |
   | Node version | Add `NODE_VERSION=22.22.0` as an environment variable |

   With `Root Directory` set to `backend`, do **not** put `cd backend` in any
   Render command. Render runs every command relative to that directory.
   `npm ci` installs from `backend/package-lock.json`; `prisma migrate deploy`
   applies the checked-in migration in `backend/prisma/migrations`; and
   `npm run build` writes the compiled server to `backend/dist/`.

   On a paid Render service, the preferred split is:

   ```text
   Build Command:     npm ci && npx prisma generate && npm run build
   Pre-Deploy Command: npx prisma migrate deploy
   Start Command:     npm start
   ```

   The Free plan does not provide a Pre-Deploy Command, so keep
   `prisma migrate deploy` in the Free-plan Build Command.

### C. Java requirement for PDF extraction

`backend/src/services/pdf/extract.ts` uses `@opendataloader/pdf`, whose Node
wrapper starts a Java process. Java is required when a user uploads a resume;
it is not just a local-development dependency. Verify the service logs include
Java 11+ before testing uploads.

Render's native Node runtime does not list Java among its guaranteed tools. For
reliable resume processing, deploy this service with the Render **Docker**
runtime. Create `backend/Dockerfile` with:

```dockerfile
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json trigger.config.ts ./
COPY src ./src
RUN npm run build

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

For the Docker service, set **Root Directory** to `backend`, choose the
**Docker** runtime, set **Dockerfile Path** to `Dockerfile`, leave Render's
Build Command empty, and use the Dockerfile above. The Dockerfile installs
dependencies, generates Prisma during `npm ci`, compiles the backend, applies
migrations at startup, and starts the server. The Node-runtime settings above
remain useful for a Render plan where Java 11+ has been installed and verified.

### D. Render environment variables

Add these variables before the first deploy because both Prisma migration and
the production server need them. Use Render's secret fields for keys and
passwords; never commit `backend/.env`.

```env
NODE_ENV=production

# Neon: pooled URL for runtime queries, direct URL for Prisma migrations
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require
DIRECT_DATABASE_URL=postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DBNAME?sslmode=require

# Generate locally with:
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
ACCESS_TOKEN_SECRET=replace-with-a-long-random-value

# Exact frontend origin; temporarily use the expected Vercel URL if it is not
# known yet, then replace it after the frontend is deployed.
FRONTEND_ORIGIN=https://your-frontend.vercel.app

# Hostname(s) only, comma-separated; no https:// and no path
RESUME_STORAGE_HOSTS=your-bucket.r2.dev

# The current backend uses ChatOpenAI with an OpenAI-compatible NVIDIA endpoint.
OPENROUTER_BASE_URL=https://integrate.api.nvidia.com/v1
OPENROUTER_API_KEY=nvapi-your-nvidia-key
NVIDIA_API_KEY=nvapi-your-nvidia-key
ARCHITECT_MODEL=nvidia/nemotron-3-super-120b-a12b:free
BLUEPRINT_MODEL=nvidia/nemotron-3-super-120b-a12b:free
CODE_MODEL=nvidia/nemotron-3-super-120b-a12b:free
RESUME_MODEL=nvidia/nemotron-3-super-120b-a12b:free

# Used by the API to trigger the deployed Trigger.dev task
TRIGGER_SECRET_KEY=tr_prod_your-trigger-secret

# Used by the Trigger.dev deploy task, which publishes generated sites
VERCEL_TOKEN=vcp_your-vercel-token
```

`PORT` is intentionally omitted: Render sets it and `src/server.ts` reads it.
`NIM_URL` is present in the example environment file, but the current runtime
client reads `OPENROUTER_BASE_URL` and `OPENROUTER_API_KEY`; set the latter two
for actual AI requests.

Leave Render's **Health Check Path** empty. This API currently has no public
`/health` route, and `/auth/me` intentionally returns `401` without a token;
Render's default TCP health check is the correct check for the current code.

### E. Deploy and verify the backend

Click **Create Web Service**. After the first successful deploy, copy the
service URL, for example `https://forge-backend.onrender.com`.

```bash
export BACKEND_URL=https://forge-backend.onrender.com

# A 401 is expected without an access token and confirms that Express is live.
curl -i "$BACKEND_URL/auth/me"

# Confirm the Render service is using HTTPS and accepts the auth route.
curl -i -X POST "$BACKEND_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"deployment-check","email":"deployment-check@example.com","password":"change-this-password"}'
```

The signup request should return `201` once the database migration is applied.
Delete the test account from Neon if it is not needed.

### F. Deploy the Trigger.dev tasks after the API is live

The Render API calls `websiteTask.trigger()`, while the long-running
architecture/blueprint/code-generation/deploy tasks run on Trigger.dev. From
the backend directory:

```bash
cd backend
npm ci
npx prisma generate
npm run build
npx trigger login
npx trigger deploy --env prod --skip-sync-env-vars
```

In the Trigger.dev project environment, add the variables needed by the task
runtime: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `OPENROUTER_BASE_URL`,
`OPENROUTER_API_KEY`, the four model variables, and `VERCEL_TOKEN`. The
`project` value is already in `backend/trigger.config.ts`; no
`TRIGGER_PROJECT_ID` variable is required by the current source. Keep the
matching `TRIGGER_SECRET_KEY` in Render so the API can trigger the deployed
tasks.

### Important Render limitations

- Free Web Services sleep after inactivity and can take about a minute to wake.
- The filesystem is ephemeral. Generated portfolio files under `backend/generated/`
  must not be treated as permanent storage; the database and deployed Vercel
  URL are the durable records.
- The PDF parser, NVIDIA endpoint, Neon database, Trigger.dev, and Vercel are
  all external dependencies. Check Render and Trigger.dev logs when a pipeline
  reaches a stage but does not complete.

---

## 4️⃣ Frontend — Vercel (deploy after the backend)

### Method A: Git Integration (Recommended)

1. Deploy the Render backend and Trigger.dev tasks first using section 3.
2. Go to [vercel.com](https://vercel.com) → **Add New Project**.
3. Import the same GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Use these build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
6. Add these frontend environment variables before deploying:
   ```env
   # Express backend URL obtained from Render section 3
   VITE_SERVER_URL=https://forge-backend.onrender.com

   # Upload worker URL; the returned hostname must be in RESUME_STORAGE_HOSTS
   VITE_API_URL=https://your-upload-worker.your-subdomain.workers.dev
   ```
7. Click **Deploy** and copy the final Vercel URL.
8. Return to Render and change `FRONTEND_ORIGIN` to that exact Vercel URL, then
   redeploy/restart the backend.

`VITE_SERVER_URL` is the backend URL used by `frontend/src/lib/api.ts`.
`VITE_API_URL` is the separate upload-worker URL; it is not the Express
backend URL.

### Method B: Vercel CLI

```bash
cd frontend
npm ci
npm install --global vercel
vercel login
vercel --prod
```

Set `VITE_SERVER_URL` and `VITE_API_URL` when Vercel prompts for environment
variables. These values are embedded at build time, so redeploy after changing
them.

### Vercel Free Tier Includes

- Unlimited bandwidth
- Serverless Functions
- Custom domains
- Automatic HTTPS

### Cross-origin refresh-cookie requirement

The backend uses an HTTP-only, secure refresh-token cookie and the frontend
sends credentials. A Vercel domain and an `onrender.com` domain are different
sites, while the current backend cookie is configured with `SameSite=Lax`.
For reliable refresh sessions, use frontend/backend custom domains under the
same site, or update the cookie configuration in
`backend/src/controllers/auth.controller.ts` to `sameSite: "none"` with
`secure: true` and redeploy the backend. CORS must still use the exact
frontend origin.

---

## 5️⃣ Trigger.dev — Background Tasks

### Option A: Trigger.dev Cloud (Free Tier)

The Trigger.dev project reference is already configured in
`backend/trigger.config.ts`. Sign in with the CLI, add the task environment
variables in the Trigger.dev dashboard, and deploy the task bundle:

```bash
cd backend
npm ci
npx prisma generate
npm run build
npx trigger login
npx trigger deploy --env prod --skip-sync-env-vars
```

Set `DATABASE_URL`, `DIRECT_DATABASE_URL`, `OPENROUTER_BASE_URL`,
`OPENROUTER_API_KEY`, `ARCHITECT_MODEL`, `BLUEPRINT_MODEL`, `CODE_MODEL`,
`RESUME_MODEL`, and `VERCEL_TOKEN` in the Trigger.dev project environment.
Keep the matching `TRIGGER_SECRET_KEY` in the Render Web Service environment.

The `trigger.config.ts` is already configured:
   ```typescript
   export default defineConfig({
     project: "proj_beofqrqhzbhglsiqvgaq",
     runtime: "node",
     logLevel: "log",
     maxDuration: 3600,
     dirs: ["./src/trigger"],
   });
   ```

### Option B: Self-Hosted (Free — Docker)

1. Run Trigger.dev runner locally or on a free-tier VPS:
   ```bash
   docker run -it --rm \
     -e TRIGGER_SECRET_KEY=tr_dev_... \
     -e TRIGGER_API_URL=http://localhost:3000 \
     triggerdotdev/trigger-runner-sdk:latest
   ```
2. Set `TRIGGER_API_URL` in backend env to point to the runner

### Task Definitions

The pipeline tasks are in `backend/src/trigger/`:
- `parent.ts` — Orchestrates the full pipeline (ARCHITECTING → BLUEPRINTING → GENERATING_HTML/CSS/JS → VALIDATING → BUILDING → DEPLOYING)
- `architect.ts` — Architecture planning
- `blueprint.ts` — Design decisions
- `html.ts`, `css.ts`, `js.ts` — Code generation
- `validate.ts` — Consistency checks
- `build.ts` — File bundling
- `deploy.ts` — Vercel deployment
- `merge.ts` — Asset merging

---

## 6️⃣ Full Deployment Checklist

### Local Build Test (Before Deploying)

```bash
# Install, generate Prisma, and build backend
cd backend
npm ci
npx prisma generate
npm run build
npm start  # Should start on Render's PORT, or 3001 locally

# Build frontend
cd ../frontend
npm ci
npm run build
npm run preview  # Should serve on port 4173
```

The backend build must exit successfully before pushing a Render deploy. The
current checkout reports TypeScript errors from `npm run build`; fix those
errors first because Render will stop during its build command and will not
start the backend.

### Deploy Order

1. ✅ **Neon Database** — Create project, get connection string
2. ✅ **Backend** — Deploy the API to Render and run the Prisma migration
3. ✅ **Trigger.dev** — Deploy the background tasks and set task env vars
4. ✅ **Frontend** — Deploy to Vercel after obtaining the Render URL
5. ✅ **Backend CORS** — Set the final `FRONTEND_ORIGIN` and redeploy Render
6. ✅ **Test Pipeline** — Sign up → upload resume → verify full generation

### Post-Deploy Verification

```bash
# Test backend reachability; 401 is expected without an access token
curl -i https://your-backend.onrender.com/auth/me

# Test portfolio generation (requires auth)
curl -X POST https://your-backend.onrender.com/api/portfolio/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"resumeUrl":"https://your-r2-storage/resume.pdf"}'
```

---

## 7️⃣ Environment Variables Reference

### Backend `.env`

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | Render-injected server port; omit on Render | `3001` locally |
| `DATABASE_URL` | Neon PostgreSQL connection | `postgresql://...` |
| `DIRECT_DATABASE_URL` | Direct DB connection | `postgresql://...` |
| `ACCESS_TOKEN_SECRET` | JWT signing secret | `your-random-string` |
| `FRONTEND_ORIGIN` | Exact frontend origin for CORS | `https://your-frontend.vercel.app` |
| `RESUME_STORAGE_HOSTS` | Allowed resume hostnames only | `your-bucket.r2.dev` |
| `OPENROUTER_BASE_URL` | OpenAI-compatible AI endpoint | `https://integrate.api.nvidia.com/v1` |
| `OPENROUTER_API_KEY` | AI endpoint key | Same as NVIDIA_API_KEY |
| `NVIDIA_API_KEY` | NVIDIA key used by the diagnostic script | `nvapi-...` |
| `ARCHITECT_MODEL` | Architect model ID | `nvidia/nemotron-3-super-120b-a12b:free` |
| `BLUEPRINT_MODEL` | Blueprint model ID | `nvidia/nemotron-3-super-120b-a12b:free` |
| `CODE_MODEL` | Code generation model | `nvidia/nemotron-3-super-120b-a12b:free` |
| `RESUME_MODEL` | Resume parsing model | `nvidia/nemotron-3-super-120b-a12b:free` |
| `TRIGGER_SECRET_KEY` | Trigger.dev secret | `tr_dev_...` |
| `VERCEL_TOKEN` | Vercel deployment token | `vcp_...` |

### Frontend `.env`

| Variable | Description |
|---|---|
| `VITE_SERVER_URL` | Render backend URL |
| `VITE_API_URL` | Resume upload worker URL |

---

## 8️⃣ Cost Summary (Free Tier)

| Service | Free Tier | Notes |
|---|---|---|
| **Vercel** | 100GB bandwidth/mo | Sufficient for portfolios |
| **Neon PostgreSQL** | 0.5GB storage | Adequate for small apps |
| **NVIDIA NIM** | Free tier credits | Check build.nvidia.com for limits |
| **Trigger.dev** | Free tier | 10k runs/mo |
| **Render** | Free (spins down) | Backend Web Service |

---

## 9️⃣ Troubleshooting

### Common Issues

1. **401 Authentication Error**
   - A `401` from `GET /auth/me` without a token is expected and proves the API is running.
   - For AI requests, verify `OPENROUTER_API_KEY` is set correctly
   - Ensure `OPENROUTER_BASE_URL` points to the NVIDIA NIM endpoint

2. **Timeout Errors**
   - Increase `timeoutMs` in `backend/src/config/ai.ts`
   - Check NVIDIA API key has sufficient credits

3. **Database Connection**
   - Verify `DATABASE_URL` includes `?sslmode=require`
   - Verify `DIRECT_DATABASE_URL` is set for Prisma migrations
   - Run `npx prisma migrate deploy` after setting both database env vars

4. **CORS Errors**
   - Set `FRONTEND_ORIGIN` to your deployed frontend URL
   - Restart backend after changing env vars

5. **Trigger.dev Tasks Not Running**
   - Verify `TRIGGER_SECRET_KEY` matches dashboard
   - Confirm `npx trigger deploy --env prod` completed successfully
   - Confirm the Trigger.dev task environment contains database, AI, and `VERCEL_TOKEN` vars

6. **Render build fails**
   - Run `cd backend && npm ci && npx prisma generate && npm run build` locally
   - Fix every TypeScript error before redeploying; Render does not start a service with a failed build

7. **Resume upload fails with `java: command not found`**
   - Deploy the backend with the Docker runtime and the Java-enabled `backend/Dockerfile` in section 3C
   - Java is required by `@opendataloader/pdf` at request time

8. **Login works but the session disappears after refresh**
   - Use frontend/backend custom domains under the same site, or apply the `SameSite=None` cookie change described in section 4

### Useful Commands

```bash
# Check Render backend logs
# Use the Render Dashboard → your service → Logs

# Check Trigger.dev runs
npx trigger list

# Reset database
npx prisma migrate reset --force

# View Trigger.dev project identity
npx trigger whoami
```

---

## 📞 Support

For issues specific to:
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Neon**: [neon.tech/docs](https://neon.tech/docs)
- **Trigger.dev**: [trigger.dev/docs](https://trigger.dev/docs)
- **NVIDIA NIM**: [build.nvidia.com](https://build.nvidia.com)
