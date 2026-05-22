#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
LOG_API=/tmp/zerolink-api.log
LOG_WEB=/tmp/zerolink-web.log

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[start]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }
die()  { echo -e "${RED}[error]${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }

# ── Resolve public URLs (works on any Codespace or localhost) ─────────────────
DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}"
if [ -n "${CODESPACE_NAME:-}" ] && [ -n "$DOMAIN" ]; then
  WEB_URL="https://${CODESPACE_NAME}-5174.${DOMAIN}"
  API_URL="https://${CODESPACE_NAME}-3000.${DOMAIN}"
  MAIL_URL="https://${CODESPACE_NAME}-8026.${DOMAIN}"
  MINIO_CONSOLE_URL="https://${CODESPACE_NAME}-9003.${DOMAIN}"
  CDN_BASE="https://${CODESPACE_NAME}-9002.${DOMAIN}/zerolink-media"
else
  WEB_URL="http://localhost:5174"
  API_URL="http://localhost:3000"
  MAIL_URL="http://localhost:8026"
  MINIO_CONSOLE_URL="http://localhost:9003"
  CDN_BASE="http://localhost:9002/zerolink-media"
fi

# ── Step 1: Kill stale processes ──────────────────────────────────────────────
step "Checking for stale processes..."
pkill -f "tsx src/server.ts"   2>/dev/null && warn "Killed stale API process." || true
pkill -f "vite --port 5174"    2>/dev/null && warn "Killed stale web process." || true
sleep 1

# ── Step 2: Start Docker infrastructure ──────────────────────────────────────
step "Starting Docker infrastructure (postgres, redis, minio, mailhog)..."
cd "$ROOT"
docker compose up -d postgres redis minio mailhog

log "Waiting for postgres to be ready..."
until docker exec zl-postgres pg_isready -U zerolink -q 2>/dev/null; do sleep 1; done
log "Postgres ready."

log "Waiting for redis to be ready..."
until docker exec zl-redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 1; done
log "Redis ready."

log "Waiting for MinIO to be healthy..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' zl-minio 2>/dev/null)" = "healthy" ]; do
  sleep 2
done
log "MinIO ready."

log "Initialising MinIO buckets..."
docker compose run --rm minio-init 2>/dev/null || true
log "Buckets ready."

# ── Step 3: Configure environment ────────────────────────────────────────────
step "Configuring environment..."

if [ ! -f "$API_DIR/.env" ]; then
  warn ".env not found — creating from .env.example"
  cp "$API_DIR/.env.example" "$API_DIR/.env"
fi

# Fix port mappings (docker-compose exposes on non-default ports)
sed -i 's|postgresql://zerolink:zerolink_dev@localhost:5432|postgresql://zerolink:zerolink@localhost:5433|' "$API_DIR/.env"
sed -i 's|postgresql://zerolink:zerolink@localhost:5432|postgresql://zerolink:zerolink@localhost:5433|'     "$API_DIR/.env"
sed -i 's|REDIS_URL=redis://localhost:6379|REDIS_URL=redis://localhost:6380|'                               "$API_DIR/.env"
sed -i 's|MINIO_PORT=9000|MINIO_PORT=9002|'                                                                 "$API_DIR/.env"

# Update URLs to match this environment
sed -i "s|^APP_URL=.*|APP_URL=${WEB_URL}|"           "$API_DIR/.env"
sed -i "s|^API_URL=.*|API_URL=${API_URL}|"           "$API_DIR/.env"
sed -i "s|^CDN_BASE_URL=.*|CDN_BASE_URL=${CDN_BASE}|" "$API_DIR/.env"

# Ensure web .env exists and is up to date
if [ ! -f "$WEB_DIR/.env" ]; then
  warn "Web .env not found — creating"
  printf 'VITE_API_URL=%s\nVITE_APP_URL=%s\n' "$API_URL" "$WEB_URL" > "$WEB_DIR/.env"
fi
sed -i "s|^VITE_API_URL=.*|VITE_API_URL=${API_URL}|"   "$WEB_DIR/.env"
sed -i "s|^VITE_APP_URL=.*|VITE_APP_URL=${WEB_URL}|"   "$WEB_DIR/.env"

# ── Step 4: Install dependencies ─────────────────────────────────────────────
step "Installing dependencies..."
cd "$ROOT"
npm install --silent

# ── Step 5: Database migrations and seed ─────────────────────────────────────
step "Running database migrations..."
cd "$API_DIR"
npx tsx src/db/migrate.ts

step "Seeding database..."
npx tsx src/db/seed.ts

log "Flushing stale Redis cache..."
docker exec zl-redis redis-cli DEL "cache:categories" > /dev/null

# ── Step 6: Start API ─────────────────────────────────────────────────────────
step "Starting API (port 3000)..."
: > "$LOG_API"
cd "$API_DIR"
npx tsx src/server.ts >> "$LOG_API" 2>&1 &
API_PID=$!

log "Waiting for API to be ready..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:3000/health 2>/dev/null | grep -q '"status":"ok"'; then
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo ""
    tail -20 "$LOG_API"
    die "API process exited unexpectedly. Full log: $LOG_API"
  fi
  sleep 1
done
if ! curl -sf http://localhost:3000/health 2>/dev/null | grep -q '"status":"ok"'; then
  die "API not ready after 40s. Check $LOG_API"
fi
log "API ready."

# AI health — warn only (Groq key may not be configured)
if curl -sf http://localhost:3000/v1/api/ai/health 2>/dev/null | grep -q '"available":true'; then
  log "AI service ready (Groq connected)."
else
  warn "AI service unavailable — set GROQ_API_KEY in $API_DIR/.env to enable."
fi

# ── Step 7: Start web app ─────────────────────────────────────────────────────
step "Starting web app (port 5174)..."
: > "$LOG_WEB"
cd "$WEB_DIR"
npm run dev >> "$LOG_WEB" 2>&1 &
WEB_PID=$!

log "Waiting for web app to be ready..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:5174 2>/dev/null | grep -qi '<html'; then
    break
  fi
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    echo ""
    tail -20 "$LOG_WEB"
    die "Web process exited unexpectedly. Full log: $LOG_WEB"
  fi
  sleep 1
done
if ! curl -sf http://localhost:5174 2>/dev/null | grep -qi '<html'; then
  warn "Web app health check timed out — it may still be compiling. Check $LOG_WEB"
fi
log "Web app ready."

# ── Ready ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  ZeroLink is running!${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}Web App${NC}        →  ${WEB_URL}"
echo -e "  ${CYAN}API${NC}            →  ${API_URL}"
echo -e "  ${CYAN}MailHog${NC}        →  ${MAIL_URL}"
echo -e "  ${CYAN}MinIO Console${NC}  →  ${MINIO_CONSOLE_URL}"
echo ""
echo -e "  Logs: ${LOG_API}  |  ${LOG_WEB}"
echo -e "  Stop: Ctrl+C"
echo ""
echo -e "${BLUE}── Live logs ────────────────────────────────────────────────${NC}"

# ── Cleanup handler ───────────────────────────────────────────────────────────
cleanup() {
  echo ""
  log "Shutting down..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  kill "$TAIL_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# Stream both logs to terminal
tail -f "$LOG_API" "$LOG_WEB" &
TAIL_PID=$!

# Monitor — if either server dies unexpectedly, clean up and exit
while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    warn "API process exited unexpectedly. Check $LOG_API"
    cleanup
  fi
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    warn "Web process exited unexpectedly. Check $LOG_WEB"
    cleanup
  fi
  sleep 3
done
