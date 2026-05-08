#!/usr/bin/env bash
# SuperGit.app — main executable inside Contents/MacOS/
# Starts the Go API server + Next.js production server, then opens the WKWebView.

set -euo pipefail

# Augment PATH for Homebrew and nvm/fnm installations not in GUI app environments
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh" 2>/dev/null || true

MACOS_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTENTS_DIR="$(dirname "$MACOS_DIR")"
WEB_DIR="$CONTENTS_DIR/Resources/web"

API_PORT=8765
WEB_PORT=3000

cleanup() {
    [ -n "${API_PID:-}"  ] && kill "$API_PID"  2>/dev/null || true
    [ -n "${WEB_PID:-}"  ] && kill "$WEB_PID"  2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Start Go API server ───────────────────────────────────────────────────────
"$MACOS_DIR/supergit-server" &
API_PID=$!

# ── Start Next.js production server ──────────────────────────────────────────
NODE_BIN="$(command -v node)"
NEXT_CLI="$WEB_DIR/node_modules/next/dist/bin/next"

cd "$WEB_DIR"
PORT=$WEB_PORT HOSTNAME=127.0.0.1 "$NODE_BIN" "$NEXT_CLI" start -p $WEB_PORT -H 127.0.0.1 &
WEB_PID=$!

# ── Wait for both servers ─────────────────────────────────────────────────────
for i in $(seq 1 40); do
    curl -sf  "http://localhost:$API_PORT/api/version" >/dev/null 2>&1 && break || true
    sleep 0.5
done
for i in $(seq 1 40); do
    curl -sfL "http://localhost:$WEB_PORT" >/dev/null 2>&1 && break || true
    sleep 0.5
done

# ── Open WKWebView window (blocks until window closed → cleanup runs) ─────────
"$MACOS_DIR/supergit-webview" "http://localhost:$WEB_PORT"
