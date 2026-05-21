#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[start]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }
die()  { echo -e "${RED}[error]${NC} $1"; exit 1; }

# ── Resolve public URLs (works on any Codespace or localhost) ─────────────────
DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}"
if [ -n "$CODESPACE_NAME" ] && [ -n "$DOMAIN" ]; then
  WEB_URL="https://${CODESPACE_NAME}-5174.${DOMAIN}"
  API_URL="https://${CODESPACE_NAME}-3000.${DOMAIN}"
  MAIL_URL="https://${CODESPACE_NAME}-8026.${DOMAIN}"
else
  WEB_URL="http://localhost:5174"
  API_URL="http://localhost:3000"
  MAIL_URL="http://localhost:8026"
fi

# ── Step 1: Start infrastructure ──────────────────────────────────────────────
log "Starting Docker infrastructure (postgres, redis, minio, mailhog)..."
cd "$ROOT"
docker compose up -d postgres redis minio mailhog

log "Waiting for postgres to be healthy..."
until docker exec zl-postgres pg_isready -U zerolink -q 2>/dev/null; do
  sleep 1
done
log "Postgres is ready."

log "Waiting for redis to be healthy..."
until docker exec zl-redis redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 1
done
log "Redis is ready."

# ── Step 2: Ensure .env exists and has correct values ─────────────────────────
if [ ! -f "$API_DIR/.env" ]; then
  warn ".env not found — creating from .env.example"
  cp "$API_DIR/.env.example" "$API_DIR/.env"
fi

# Always fix port mismatches regardless of how .env was created
sed -i 's|postgresql://zerolink:zerolink_dev@localhost:5432|postgresql://zerolink:zerolink@localhost:5433|' "$API_DIR/.env"
sed -i 's|postgresql://zerolink:zerolink@localhost:5432|postgresql://zerolink:zerolink@localhost:5433|' "$API_DIR/.env"
sed -i 's|REDIS_URL=redis://localhost:6379|REDIS_URL=redis://localhost:6380|' "$API_DIR/.env"
sed -i 's|MINIO_PORT=9000|MINIO_PORT=9002|' "$API_DIR/.env"

# Update APP_URL and API_URL to match this Codespace (or localhost)
sed -i "s|^APP_URL=.*|APP_URL=${WEB_URL}|" "$API_DIR/.env"
sed -i "s|^API_URL=.*|API_URL=${API_URL}|" "$API_DIR/.env"

# ── Step 3: Install dependencies ──────────────────────────────────────────────
log "Installing dependencies..."
cd "$ROOT"
npm install --silent

# ── Step 4: Run database migrations ───────────────────────────────────────────
log "Running database migrations..."
cd "$API_DIR"
npx tsx src/db/migrate.ts

# ── Step 5: Seed the database (skips if already seeded) ───────────────────────
log "Seeding database..."
npx tsx src/db/seed.ts

log "Flushing stale Redis cache..."
docker exec zl-redis redis-cli DEL "cache:categories" > /dev/null

# ── Step 6: Start API and web app ─────────────────────────────────────────────
log "Starting API on port 3000..."
cd "$API_DIR"
npx tsx src/server.ts > /tmp/zerolink-api.log 2>&1 &
API_PID=$!

log "Waiting for API to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/health | grep -q '"status":"ok"' 2>/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -s http://localhost:3000/health | grep -q '"status":"ok"' 2>/dev/null; then
  die "API failed to start. Check /tmp/zerolink-api.log"
fi
log "API is ready."

log "Starting web app on port 5174..."
cd "$WEB_DIR"
npm run dev > /tmp/zerolink-web.log 2>&1 &
WEB_PID=$!

log "Waiting for web app to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:5174 | grep -q '<html' 2>/dev/null; then
    break
  fi
  sleep 1
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ZeroLink is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Web App  →  ${WEB_URL}"
echo -e "  API      →  ${API_URL}"
echo -e "  MailHog  →  ${MAIL_URL}"
echo ""
echo -e "  Logs: /tmp/zerolink-api.log  |  /tmp/zerolink-web.log"
echo -e "  Stop: kill $API_PID $WEB_PID  (or Ctrl+C)"
echo ""

# Keep script alive so Ctrl+C kills both servers
trap "echo ''; log 'Shutting down...'; kill $API_PID $WEB_PID 2>/dev/null; exit 0" INT TERM
wait $API_PID $WEB_PID
