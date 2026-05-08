.PHONY: server tui web stop app restart restart-web restart-tui restart-app build-go build-web all install

ROOT    := $(shell pwd)
APP_DIR := /Applications/SuperGit.app

# ── Development ────────────────────────────────────────────────────
# make web  → API server (background) + Next.js dev server (foreground)
# make tui  → API server (background) + Bubble Tea TUI (foreground)
# Logs: .log/server.log
# PID:  .log/server.pid

server:
	cd apps/tui && go run ./cmd/server

web:
	@mkdir -p .log
	@echo "Starting API server in background…"
	@cd apps/tui && go run ./cmd/server > $(ROOT)/.log/server.log 2>&1 & echo $$! > $(ROOT)/.log/server.pid
	@echo "API → http://localhost:8765  |  log: .log/server.log"
	@echo "Starting web dev server…"
	cd apps/web && npm run dev

tui:
	@mkdir -p .log
	@echo "Starting API server in background…"
	@cd apps/tui && go run ./cmd/server > $(ROOT)/.log/server.log 2>&1 & echo $$! > $(ROOT)/.log/server.pid
	@echo "API → http://localhost:8765  |  log: .log/server.log"
	@echo "Starting TUI…"
	cd apps/tui && go run ./cmd/tui

stop:
	@if [ -f .log/server.pid ]; then \
		kill $$(cat .log/server.pid) 2>/dev/null && echo "API server stopped" || echo "API server already stopped"; \
		rm -f .log/server.pid; \
	fi
	@pkill -f "supergit-server" 2>/dev/null && echo "supergit-server stopped" || true
	@pkill -f "supergit-tui"    2>/dev/null && echo "supergit-tui stopped"    || true
	@pkill -f "next start"      2>/dev/null && echo "Next.js server stopped"  || true
	@pkill -f "SuperGit"        2>/dev/null && echo "SuperGit.app stopped"    || true
	@lsof -ti tcp:8765 | xargs kill -9 2>/dev/null || true
	@lsof -ti tcp:3000 | xargs kill -9 2>/dev/null || true

# ── Restart ────────────────────────────────────────────────────────

restart-web: stop
	@$(MAKE) web

restart-tui: stop
	@$(MAKE) tui

restart-app: stop
	@$(MAKE) app

restart: restart-web

# ── macOS App Bundle ───────────────────────────────────────────────
# make app  → builds Go server binary, builds Next.js production,
#             compiles Swift WKWebView launcher, assembles SuperGit.app,
#             code-signs, and opens it.

app: build-go build-web _compile-webview _assemble-app
	@echo "→ Launching SuperGit.app…"
	@open "$(APP_DIR)"
	@echo "✓ Done"

_compile-webview:
	@echo "→ Compiling Swift WKWebView launcher…"
	@swiftc scripts/webview.swift \
	    -framework Cocoa -framework WebKit \
	    -o scripts/supergit-webview
	@echo "  compiled scripts/supergit-webview"

_assemble-app:
	@echo "→ Killing any running SuperGit instance…"
	@pkill -f "SuperGit" 2>/dev/null || true
	@pkill -f "supergit-server" 2>/dev/null || true
	@lsof -ti tcp:3000 | xargs kill -9 2>/dev/null || true
	@lsof -ti tcp:8765 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "→ Assembling $(APP_DIR)…"
	@rm -rf "$(APP_DIR)"
	@mkdir -p "$(APP_DIR)/Contents/MacOS"
	@mkdir -p "$(APP_DIR)/Contents/Resources/web"
	@cp scripts/Info.plist         "$(APP_DIR)/Contents/Info.plist"
	@cp scripts/supergit-launcher.sh "$(APP_DIR)/Contents/MacOS/supergit-launcher"
	@chmod +x "$(APP_DIR)/Contents/MacOS/supergit-launcher"
	@cp scripts/supergit-webview   "$(APP_DIR)/Contents/MacOS/supergit-webview"
	@cp apps/tui/bin/supergit-server "$(APP_DIR)/Contents/MacOS/supergit-server"
	@chmod +x "$(APP_DIR)/Contents/MacOS/supergit-server"
	@chmod +x "$(APP_DIR)/Contents/MacOS/supergit-webview"
	@echo "→ Copying Next.js production build + node_modules…"
	@cp -r apps/web/.next                   "$(APP_DIR)/Contents/Resources/web/.next"
	@cp    apps/web/package.json            "$(APP_DIR)/Contents/Resources/web/package.json"
	@cp -r apps/web/node_modules            "$(APP_DIR)/Contents/Resources/web/node_modules"
	@cp -r apps/web/public                  "$(APP_DIR)/Contents/Resources/web/public" 2>/dev/null || true
	@echo "→ Code-signing…"
	@codesign --force --deep --sign - "$(APP_DIR)"
	@echo "  assembled $(APP_DIR)"

# ── Build ──────────────────────────────────────────────────────────
build-go:
	mkdir -p apps/tui/bin
	cd apps/tui && go build -o bin/supergit-server ./cmd/server
	cd apps/tui && go build -o bin/supergit-tui    ./cmd/tui

build-web:
	cd apps/web && npm run build

all: build-go build-web

# ── Install web deps ───────────────────────────────────────────────
install:
	cd apps/web && npm install
