#!/usr/bin/env bash
#
# Run the whole stack locally with one command: the Next web app + the
# rb-extractor worker, together.
#
# The worker uses the PROD Redis (db-server) but listens on an ISOLATED queue
# (`stream-extract-dev`) so it never competes with the deployed prod worker for
# jobs. The web app is pointed at the same queue via STREAM_QUEUE in .env.local.
#
# Usage:  npm run dev:all      (or: bash scripts/dev.sh)
# Ctrl-C stops both.
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "✗ .env.local not found — copy the dev env first." >&2
  exit 1
fi

# The app reads .env.local itself; the worker (plain node) needs REDIS_URL passed in.
REDIS_URL=$(grep -E '^REDIS_URL=' .env.local | head -1 | sed 's/^REDIS_URL=//; s/^"//; s/"$//')
export REDIS_URL
export STREAM_QUEUE="${STREAM_QUEUE:-stream-extract-dev}"
export PROVIDERS="${PROVIDERS:-vidlink.pro,spencerdevs,vidrock,Videasy,VidSrc.fyi}"
export PORT="${WORKER_PORT:-8791}"
export CONCURRENCY="${CONCURRENCY:-2}"

APP_PORT="${APP_PORT:-3010}"

# worker deps live in rb-extractor/node_modules (own install, or symlinked).
if [ ! -e rb-extractor/node_modules ]; then
  echo "✗ rb-extractor/node_modules missing — run: (cd rb-extractor && npm install)" >&2
  exit 1
fi

echo "▶ dev worker  → queue '$STREAM_QUEUE' on redis ${REDIS_URL##*@}"
echo "▶ web app     → http://0.0.0.0:$APP_PORT"
echo

# Kill the whole process group on exit so both stop together.
trap 'echo; echo "stopping…"; kill 0 2>/dev/null || true' EXIT INT TERM

# Worker under xvfb so headed/Turnstile providers (VidSrc.fyi/SuperEmbed) also work.
WORKER_CMD="node worker.mjs"
if command -v xvfb-run >/dev/null 2>&1; then WORKER_CMD="xvfb-run -a $WORKER_CMD"; fi
( cd rb-extractor && exec $WORKER_CMD 2>&1 | sed -u 's/^/[worker] /' ) &

# Web app in the foreground.
npx next dev --turbopack -H 0.0.0.0 -p "$APP_PORT" 2>&1 | sed -u 's/^/[web]    /'
