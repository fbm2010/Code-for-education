Deployment guide
================

This repository is a monorepo. Recommended deployment approach:

1) Frontend (`zerolink/apps/web`) — deploy to Vercel
   - Connect the GitHub repository in Vercel.
   - Create a Vercel project that points to the repo and set the Root Directory to `zerolink/apps/web`.
   - Build command: `npm run build` (already present in `apps/web/package.json`).
   - Output directory: `dist`.
   - Add environment variables in Vercel for `VITE_API_URL` (pointing to your API) and `VITE_APP_URL`.

2) API (`zerolink/apps/api`) — deploy to a container host or server (recommended)
   - Fastify is a long-running process and not ideal as Vercel Serverless functions without refactor.
   - Use Docker (image built from `zerolink/apps/api/Dockerfile`) and deploy to Render, Fly, DigitalOcean App Platform, or a VPS.
   - Provide environment variables (see `.env` sample below). Ensure Postgres + Redis + MinIO are reachable from the API.

3) Environment variables (important ones):
   - `DATABASE_URL` — Postgres connection string
   - `REDIS_URL` — Redis connection string
   - `SESSION_SECRET` — random hex string
   - `API_URL` — public API base URL (e.g., https://api.example.com)
   - `APP_URL` — frontend app URL (e.g., https://app.example.com)
   - `GROQ_API_KEY` and `GROQ_MODEL` — AI provider credentials
   - `MINIO_*` — if using MinIO

4) Quick local deploy steps (frontend preview):
   cd zerolink/apps/web
   npm install
   npm run build
   npx serve dist

5) Building the API Docker image (example):
   cd zerolink
   docker build -f apps/api/Dockerfile -t zerolink-api:latest .
   docker run -e DATABASE_URL=... -e REDIS_URL=... -p 3000:3000 zerolink-api:latest

Notes
-----
- We intentionally keep API separate from Vercel; if you prefer a single Vercel project, you can convert endpoints into serverless functions, but that requires refactoring Fastify handlers into small functions.
- The `vercel.json` file in the repo root is a minimal configuration for deploying the frontend.
