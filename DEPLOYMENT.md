# FORGE PORTFOLIO BUILDER — Deployment Guide

Complete deployment instructions for the Forge Portfolio Builder using **free-tier** options.

## 🏗️ Architecture Overview

```
Frontend (Vercel)  →  Backend API (Vercel Serverless / Render)  →  Neon PostgreSQL
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
- Node.js 18+ (local build only)

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

For production (after deploying the backend):

```bash
# Set DATABASE_URL in Vercel/Render env first, then:
npx prisma migrate deploy
```

---

## 2️⃣ NVIDIA API Key

1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Create an API key (free tier available)
3. The key format is `nvapi-...`
4. Set in all deployment env vars as `NVIDIA_API_KEY`

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

## 3️⃣ Frontend — Vercel (Free)

### Method A: Git Integration (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Add New Project
3. Import your repository
4. Vercel auto-detects Vite + React
5. **Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. **Environment Variables** (Frontend):
   ```
   VITE_API_URL=https://your-backend-url.vercel.app
   ```
7. Click **Deploy**

### Method B: Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

Follow prompts to link the project and set env vars.

### Vercel Free Tier Includes
- Unlimited bandwidth
- Serverless Functions
- Custom domains
- Automatic HTTPS

---

## 4️⃣ Backend — Vercel Serverless Functions (Free)

### Setup

1. In your Vercel project, add the backend:
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Output Directory: `dist`
   - Dev Command: `node dist/server.js`

2. **Environment Variables** (Backend):
   ```
   PORT=3001
   NODE_ENV=production
   DATABASE_URL=your_neon_connection_string
   DIRECT_DATABASE_URL=your_neon_direct_connection
   ACCESS_TOKEN_SECRET=your_random_secret
   RESUME_STORAGE_HOSTS=your-r2-hostname
   NVIDIA_API_KEY=nvapi-...
   NIM_URL=https://integrate.api.nvidia.com/v1
   OPENROUTER_BASE_URL=https://integrate.api.nvidia.com/v1
   OPENROUTER_API_KEY=your-nvidia-api-key
   ARCHITECT_MODEL=nvidia/nemotron-3-super-120b-a12b:free
   BLUEPRINT_MODEL=nvidia/nemotron-3-super-120b-a12b:free
   CODE_MODEL=nvidia/nemotron-3-super-120b-a12b:free
   RESUME_MODEL=nvidia/nemotron-3-super-120b-a12b:free
   FRONTEND_ORIGIN=https://your-frontend-url.vercel.app
   ```

### Alternative: Render.com (Free Tier)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub repo
3. **Settings:**
   - Build Command: `cd backend && npm install && npx prisma generate && npm run build`
   - Start Command: `node dist/server.js`
   - Instance: Free (shared CPU, spins down after inactivity)
4. Add the same environment variables above

### Important Notes for Free Tiers

- **Vercel Serverless**: Cold start ~1-3s on free tier
- **Render Free**: Spins down after 15 min inactivity, cold start ~10s
- Both are suitable for development / low-traffic projects

---

## 5️⃣ Trigger.dev — Background Tasks

### Option A: Trigger.dev Cloud (Free Tier)

1. Go to [trigger.dev](https://trigger.dev) → Sign up
2. Create a new project → Copy the **Project ID**
3. Set env vars:
   ```
   TRIGGER_PROJECT_ID=proj_your-project-id
   TRIGGER_SECRET_KEY=sk_tf_...
   ```
4. The `trigger.config.ts` is already configured:
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
# Build backend
cd backend
npm run build
node dist/server.js  # Should start on port 3001

# Build frontend
cd ../frontend
npm run build
npm run preview  # Should serve on port 4173
```

### Deploy Order

1. ✅ **Neon Database** — Create project, get connection string
2. ✅ **Backend** — Deploy to Vercel/Render, set all env vars
3. ✅ **Frontend** — Deploy to Vercel, set `VITE_API_URL`
4. ✅ **Trigger.dev** — Configure runner (cloud or self-hosted)
5. ✅ **Test Pipeline** — Upload resume → Verify full generation

### Post-Deploy Verification

```bash
# Test backend health
curl https://your-backend.vercel.app/auth/me

# Test portfolio generation (requires auth)
curl -X POST https://your-backend.vercel.app/api/portfolio/generate \
  -H "Authorization: Bearer <token>" \
  -d '{"resumeUrl":"https://your-r2-storage/resume.pdf"}'
```

---

## 7️⃣ Environment Variables Reference

### Backend `.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | Neon PostgreSQL connection | `postgresql://...` |
| `DIRECT_DATABASE_URL` | Direct DB connection | `postgresql://...` |
| `ACCESS_TOKEN_SECRET` | JWT signing secret | `your-random-string` |
| `NVIDIA_API_KEY` | NVIDIA API key | `nvapi-...` |
| `NIM_URL` | NVIDIA NIM endpoint | `https://integrate.api.nvidia.com/v1` |
| `OPENROUTER_BASE_URL` | AI gateway URL | `https://integrate.api.nvidia.com/v1` |
| `OPENROUTER_API_KEY` | AI gateway key | Same as NVIDIA_API_KEY |
| `ARCHITECT_MODEL` | Architect model ID | `nvidia/nemotron-3-super-120b-a12b:free` |
| `BLUEPRINT_MODEL` | Blueprint model ID | `nvidia/nemotron-3-super-120b-a12b:free` |
| `CODE_MODEL` | Code generation model | `nvidia/nemotron-3-super-120b-a12b:free` |
| `RESUME_MODEL` | Resume parsing model | `nvidia/nemotron-3-super-120b-a12b:free` |
| `FRONTEND_ORIGIN` | Frontend URL | `https://your-frontend.vercel.app` |
| `RESUME_STORAGE_HOSTS` | Allowed resume hosts | `your-r2-hostname` |
| `TRIGGER_SECRET_KEY` | Trigger.dev secret | `tr_dev_...` |
| `VERCEL_TOKEN` | Vercel deployment token | `vcp_...` |

### Frontend `.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL |

---

## 8️⃣ Cost Summary (Free Tier)

| Service | Free Tier | Notes |
|---|---|---|
| **Vercel** | 100GB bandwidth/mo | Sufficient for portfolios |
| **Neon PostgreSQL** | 0.5GB storage | Adequate for small apps |
| **NVIDIA NIM** | Free tier credits | Check build.nvidia.com for limits |
| **Trigger.dev** | Free tier | 10k runs/mo |
| **Render** | Free (spins down) | Alternative to Vercel for backend |

---

## 9️⃣ Troubleshooting

### Common Issues

1. **401 Authentication Error**
   - Verify `NVIDIA_API_KEY` is set correctly
   - Ensure `OPENROUTER_BASE_URL` points to NIM endpoint

2. **Timeout Errors**
   - Increase `timeoutMs` in `backend/src/config/ai.ts`
   - Check NVIDIA API key has sufficient credits

3. **Database Connection**
   - Verify `DATABASE_URL` includes `?sslmode=require`
   - Run `npx prisma migrate deploy` after setting env

4. **CORS Errors**
   - Set `FRONTEND_ORIGIN` to your deployed frontend URL
   - Restart backend after changing env vars

5. **Trigger.dev Tasks Not Running**
   - Verify `TRIGGER_SECRET_KEY` matches dashboard
   - Check runner is connected to the project

### Useful Commands

```bash
# Check backend logs
vercel logs your-project-name

# Check Trigger.dev runs
npx trigger.dev list

# Reset database
npx prisma migrate reset --force

# View project status
npx trigger.dev status
```

---

## 📞 Support

For issues specific to:
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Neon**: [neon.tech/docs](https://neon.tech/docs)
- **Trigger.dev**: [trigger.dev/docs](https://trigger.dev/docs)
- **NVIDIA NIM**: [build.nvidia.com](https://build.nvidia.com)