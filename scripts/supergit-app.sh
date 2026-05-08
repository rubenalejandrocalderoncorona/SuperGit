#!/usr/bin/env bash
# SuperGit macOS launcher: starts Go API server, opens WKWebView window.
# Placed inside SuperGit.app/Contents/MacOS/supergit-app.sh by 'make app'.

set -euo pipefail

BUNDLE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_BIN="$BUNDLE_DIR/MacOS/supergit-server"
WEB_BIN="$BUNDLE_DIR/MacOS/supergit-webview"
PORT=3000
API_PORT=8765
SERVER_PID=""

cleanup() {
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
    # Kill the Next.js server if we started it
    [ -n "${WEB_PID:-}" ] && kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start API server
"$SERVER_BIN" &
SERVER_PID=$!

# Wait for API server to be ready
for i in $(seq 1 20); do
    curl -sf "http://localhost:$API_PORT/api/version" >/dev/null 2>&1 && break
    sleep 0.5
done

# Launch WKWebView window (compiled Swift binary)
"$WEB_BIN" "http://localhost:$PORT"
