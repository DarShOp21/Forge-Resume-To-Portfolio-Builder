# FORGE PORTFOLIO BUILDER

**AI-Powered Resume-to-Portfolio Generator**

A modern web application that transforms resumes into beautiful, interactive portfolios through a guided multi-stage pipeline. Built with NVIDIA NIM for AI models and Trigger.dev for background task management.

## 🚀 Overview

Forge transforms resume documents into interactive portfolio websites through a structured, multi-stage process:

1. **Resume Input** - Upload or paste resume text (via URL from R2/S3 storage)
2. **Extraction** - Parse resume content from PDF or text
3. **Architect** - Plan architecture and structure using AI reasoning
4. **Blueprint** - Define design decisions and structure
5. **Generation** - Create HTML/CSS/JS files
6. **Validation** - Verify consistency across stages
7. **Build** - Generate final deployable files
8. **Deploy** - Publish to Vercel via Trigger.dev

## ✨ Key Features

- **NVIDIA NIM Integration**: Uses `nvidia/nemotron-3-super-120b-a12b:free` model for all AI stages
- **Background Processing**: Trigger.dev manages long-running portfolio generation tasks
- **Real-time Progress Tracking**: Visual pipeline visualization with status updates
- **Smart Storage**: Resume storage with Cloudflare R2 compatibility
- **End-to-End Pipeline**: From input to live deployment
- **Multi-model Support**: Configurable per-stage model selection
- **React 19 Frontend**: Modern UI with GSAP animations

## 🛠️ Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: CSS with design tokens
- **Animations**: GSAP + ScrollTrigger
- **UI**: Responsive, accessible, mobile-first
- **Routing**: React Router v7

### Backend
- **Framework**: Express.js
- **ORM**: Prisma
- **AI Gateway**: Direct NVIDIA NIM integration (via `@langchain/openai`)
- **Database**: Neon PostgreSQL (or local Docker)
- **Authentication**: JWT-based session management
- **Background Tasks**: Trigger.dev SDK
- **PDF Processing**: `@opendataloader/pdf` + `unpdf`

### **Deployment**
- **Frontend**: Vercel (recommended)
- **Backend**: Vercel Serverless Functions or Render
- **Background Tasks**: Trigger.dev (self-hosted or cloud)
- **Database**: Neon PostgreSQL (recommended) or local Docker

## 🛠️ Setup & Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- (Optional) Docker for local Postgres

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/forge-portfolio-builder.git
cd FORGE PORTFOLIO BUILDER

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration (see below)

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your configuration

# Database setup (if using local Postgres)
docker-compose up -d
npx prisma migrate dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your own values. Never commit `.env`.

#### Backend (`backend/.env`)
```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

# Database — pooled URL for the app, direct URL for migrations
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DBNAME?sslmode=require"

# Auth — generate with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
ACCESS_TOKEN_SECRET=replace-me-with-a-long-random-string

# Resume storage allowlist (comma-separated hostnames only, no scheme)
RESUME_STORAGE_HOSTS=your-bucket.r2.dev

# AI (NVIDIA NIM)
NIM_URL=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxx

# Per-stage model overrides (all use the same NVIDIA NIM model)
ARCHITECT_MODEL=nvidia/nemotron-3-super-120b-a12b:free
BLUEPRINT_MODEL=nvidia/nemotron-3-super-120b-a12b:free
CODE_MODEL=nvidia/nemotron-3-super-120b-a12b:free
RESUME_MODEL=nvidia/nemotron-3-super-120b-a12b:free

# Deployment
VERCEL_TOKEN=vcp_xxxxxxxxxxxxxxxxxxxxxxxx
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxxxxxxxxx
```

#### Frontend (`frontend/.env`)
```env
VITE_SERVER_URL=http://localhost:3001
VITE_API_URL=https://your-upload-worker.your-subdomain.workers.dev
```

### Development

```bash
# Start backend server (compiled)
cd backend
node dist/server.js

# Or use tsx watch for development
npm run tsx watch

# Start frontend dev server
cd ../frontend
npm run dev
```

---

## 🚀 Deployment Guide

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed free-tier deployment instructions.

### Quick Start

1. **Database**: Set up Neon PostgreSQL (free tier)
2. **Backend**: Deploy to Vercel (Serverless Functions) or Render
3. **Frontend**: Deploy to Vercel
4. **Trigger.dev**: Configure cloud runner or self-hosted
5. **Environment Variables**: Set all required variables in each platform

### Backend Deployment (Vercel)
- Root Directory: `backend`
- Build Command: `npm install && npx prisma generate && npm run build`
- Output Directory: `dist`
- Dev Command: `node dist/server.js`

### Frontend Deployment (Vercel)
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

---

## 📦 Project Structure

```
/home/darshan/Desktop/PROJECTS/FORGE PORTFOLIO BUILDER/
├── backend/                # Node.js backend (port 3001)
│   ├── src/
│   │   ├── config/      # AI model configuration
│   │   ├── controllers/ # Express routes (auth, portfolio)
│   │   ├── lib/         # Database connection
│   │   ├── middlewares/ # Auth, rate limiting
│   │   ├── routes/      # Route definitions
│   │   ├── schemas/     # Zod validation schemas
│   │   ├── services/    # PDF extraction, resume parsing
│   │   ├── trigger/     # Trigger.dev task definitions
│   │   └── types/       # TypeScript types
│   ├── dist/            # Compiled backend files
│   ├── generated/       # Generated portfolio files
│   ├── prompts/         # AI prompt templates
│   └── skills/          # Skill definitions
│
├── frontend/             # React frontend (port 5173)
│   ├── src/
│   │   ├── App.tsx      # Main app component
│   │   ├── components/  # UI components
│   │   ├── context/     # React context
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities
│   │   ├── pages/       # Page components
│   │   └── styles/      # CSS variables and styles
│   ├── public/          # Static assets
│   ├── index.html       # HTML template
│   ├── index.css        # Global styles
│   └── main.tsx         # Entry point
│
├── .claude/              # Claude Code configuration
│   ├── launch.json        # Dev server launch config
│   └── ...               # Agent configurations
│
├── docker-compose.yml      # Local development setup
├── .env                  # Environment variables
├── .env.example          # Template for environment variables
├── README.md             # Project overview (this file)
└── DEPLOYMENT.md         # Detailed deployment instructions
```

---

## 📦 Getting Started

1. **Clone Repository**:
   ```bash
   git clone https://github.com/your-username/forge-portfolio-builder.git
   cd FORGE PORTFOLIO BUILDER
   ```

2. **Install Dependencies**:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure Environment Variables**:
   - Copy `.env.example` to `.env` in both backend and frontend
   - Update `NVIDIA_API_KEY` with your actual key from build.nvidia.com
   - Set `DATABASE_URL` to your Neon PostgreSQL connection string
   - Configure `RESUME_STORAGE_HOSTS` for your storage provider

4. **Database Setup**:
   - For local development: Use `docker-compose.yml` to run PostgreSQL
   - For production: Configure Neon PostgreSQL connection in `.env`
   - Run migrations: `npx prisma migrate dev`

5. **Start Development Servers**:
   ```bash
   # Backend (compiled)
   cd backend
   node dist/server.js

   # Or use tsx watch for hot reload
   npm run tsx watch
   ```

6. **Access Application**:
   - Backend API: http://localhost:3001
   - Frontend: http://localhost:5173
   - Health check: http://localhost:3001/auth/me (requires auth)