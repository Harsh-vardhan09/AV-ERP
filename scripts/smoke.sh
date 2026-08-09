#!/usr/bin/env bash
# scripts/smoke.sh — run from repo root before every commit.
set -euo pipefail

PORT=${PORT:-4000}
BASE="http://localhost:$PORT"
COOKIES=$(mktemp)
BOOT_LOG=$(mktemp)
BUILD_LOG=$(mktemp)
SERVER_PID=""

# Git Bash `kill` often fails against a native Windows process, which used to
# leave the server holding the port and the next run green against stale code
stop_server() {
  [[ -z "$SERVER_PID" ]] && return 0
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  SERVER_PID=""
}

cleanup() {
  stop_server
  rm -f "$COOKIES" "$BOOT_LOG" "$BUILD_LOG"
}
trap cleanup EXIT

# credentials come from scripts/.env.smoke (gitignored) — never hardcode them
if [[ ! -f scripts/.env.smoke ]]; then
  echo "!! scripts/.env.smoke missing. Needs SMOKE_SCHOOL_CODE, SMOKE_EMAIL, SMOKE_PASSWORD"
  exit 1
fi
source scripts/.env.smoke
: "${SMOKE_SCHOOL_CODE:?set SMOKE_SCHOOL_CODE in scripts/.env.smoke}"
: "${SMOKE_EMAIL:?set SMOKE_EMAIL in scripts/.env.smoke}"
: "${SMOKE_PASSWORD:?set SMOKE_PASSWORD in scripts/.env.smoke}"

# A leftover server would answer the health poll and turn the run green against
# stale code, so refuse to start rather than test the wrong process
if curl -sf "$BASE/api/v1/health" >/dev/null 2>&1; then
  echo "!! something is already listening on $PORT — stop it and re-run"
  exit 1
fi

echo "── 1. booting api"
# node directly, not npm: kill needs the server's own pid, not a wrapper's
(cd apps/api && exec node src/main.js) > "$BOOT_LOG" 2>&1 &
SERVER_PID=$!

echo "── 2. waiting for health"
for i in $(seq 1 30); do
  if curl -sf "$BASE/api/v1/health" | grep -q '"status":"ok"'; then
    echo "   up after ${i}s"; break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "!! server died on boot:"; tail -30 "$BOOT_LOG"; exit 1
  fi
  sleep 1
  [[ $i -eq 30 ]] && { echo "!! never became healthy"; tail -30 "$BOOT_LOG"; exit 1; }
done

# multipart form fields, not JSON: the login route runs multer upload.none()
echo "── 3. login"
curl -sf -X POST "$BASE/api/v1/user/login" \
  -F "schoolCode=$SMOKE_SCHOOL_CODE" \
  -F "email=$SMOKE_EMAIL" \
  -F "password=$SMOKE_PASSWORD" \
  -c "$COOKIES" | grep -q '"success":true' \
  || { echo "!! login failed"; exit 1; }

echo "── 4. authed read"
curl -sf -b "$COOKIES" "$BASE/api/v1/student-management/all" \
  | grep -q '"success"' || { echo "!! authed read failed"; exit 1; }

echo "── 5. stopping api"
stop_server

echo "── 6. web build"
(cd apps/web && npm run build) > "$BUILD_LOG" 2>&1 \
  || { echo "!! web build failed"; tail -40 "$BUILD_LOG"; exit 1; }

echo "✅ ALL GREEN"
