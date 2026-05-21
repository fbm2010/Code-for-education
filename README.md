# ZeroLink — Offline-First Multilingual Learning Platform

ZeroLink is a React + Fastify monorepo that delivers an offline-capable, multilingual learning experience. The frontend is a PWA (React 18 + Vite + Dexie), and the backend is a Fastify API backed by PostgreSQL and Redis.

---

## Live App (GitHub Codespaces)

| Service | URL |
|---|---|
| Web App | https://legendary-barnacle-qvqrj479pj59f4997-5174.app.github.dev |
| API | https://legendary-barnacle-qvqrj479pj59f4997-3000.app.github.dev |
| API Health | https://legendary-barnacle-qvqrj479pj59f4997-3000.app.github.dev/health |
| MailHog (email testing) | https://legendary-barnacle-qvqrj479pj59f4997-8026.app.github.dev |

---

## User Guide

Welcome to ZeroLink, an offline-first learning website designed to help students study anytime, anywhere. ZeroLink works on smartphones, tablets, and laptops, and once lessons are downloaded, they can be used with little to no internet connection.

### How to Log In

You can get started in Guest Mode right away, with no sign-up required. This is the fastest way to explore the website and begin learning immediately. If you want to save your progress long term, you can upgrade your guest account by adding an email and password. You can also sign in with Google for a quick login option. Once logged in, your lessons, progress, quiz scores, and study streaks will be saved and synced to your account.

### How to Use ZeroLink

After logging in, you can browse the course library, where lessons are organized into subject categories like Math Valley, Science Plains, Language River, History Peaks, and Technology Forest. Each lesson can be opened directly in the app, and if you have internet access, you can download it for offline use. ZeroLink also includes a low-bandwidth mode that shows text-only lessons for users with limited data or slow internet. After finishing a lesson, you can take a short quiz, review flashcards, and follow your personalized daily study plan in the Guidebook tab.

### Extra Features

ZeroLink also includes a Community section where users can find local resources such as libraries, Wi-Fi hotspots, and device loan programs. Teachers can share offline lesson packs, and users can filter resources by subject, language, or distance. In Settings, you can change your language, set your study goals, choose your preferred study techniques, and enable options like auto-download on Wi-Fi. Every part of ZeroLink is designed to make learning simple, flexible, and accessible, even in low-connectivity environments.

---

## Project Structure

\`\`\`
zerolink/
├── apps/
│   ├── api/          # Fastify backend (Node.js + TypeScript)
│   └── web/          # React frontend (Vite PWA)
├── packages/
│   └── shared/       # Shared types and utilities
├── infra/
│   └── docker/       # Docker init scripts
└── docker-compose.yml
\`\`\`

---

## How to Run the Application

### Prerequisites

- Node.js >= 20
- Docker and Docker Compose
- npm >= 10

### One-Command Start

\`\`\`bash
cd /workspaces/Code-for-education/zerolink
./start.sh
\`\`\`

This single script handles everything: starts Docker services, runs migrations, and launches both the API and web app.

### Step-by-Step

**Step 1 — Start infrastructure services**

\`\`\`bash
cd /workspaces/Code-for-education/zerolink
docker-compose up -d postgres redis minio mailhog
\`\`\`

**Step 2 — Configure the API environment**

\`\`\`bash
cp apps/api/.env.example apps/api/.env
\`\`\`

Verify these values in \`apps/api/.env\`:

\`\`\`env
DATABASE_URL=postgresql://zerolink:zerolink@localhost:5433/zerolink
REDIS_URL=redis://localhost:6380
MINIO_PORT=9002
\`\`\`

**Step 3 — Install dependencies**

\`\`\`bash
npm install
\`\`\`

**Step 4 — Run database migrations**

\`\`\`bash
cd apps/api
npx tsx src/db/migrate.ts
\`\`\`

**Step 5 — Start the API server**

\`\`\`bash
npm run dev
\`\`\`

Confirm it is running: \`curl http://localhost:3000/health\`

**Step 6 — Start the web app**

Open a second terminal:

\`\`\`bash
cd apps/web
npm run dev
\`\`\`

---

## Port Reference

| Service | Internal Port | Host Port |
|---|---|---|
| Web App (Vite) | 5174 | 5174 |
| API (Fastify) | 3000 | 3000 |
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6380 |
| MinIO API | 9000 | 9002 |
| MinIO Console | 9001 | 9003 |
| MailHog SMTP | 1025 | 1026 |
| MailHog UI | 8025 | 8026 |

---

## Stopping the Application

\`\`\`bash
cd /workspaces/Code-for-education/zerolink
docker-compose down
\`\`\`
