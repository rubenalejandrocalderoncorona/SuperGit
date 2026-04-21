.PHONY: server tui web stop build-go build-web all

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
	@cd apps/tui && go run ./cmd/server > $(CURDIR)/.log/server.log 2>&1 & echo $$! > $(CURDIR)/.log/server.pid
	@echo "API → http://localhost:8765  |  log: .log/server.log"
	@echo "Starting web dev server…"
	cd apps/web && npm run dev

tui:
	@mkdir -p .log
	@echo "Starting API server in background…"
	@cd apps/tui && go run ./cmd/server > $(CURDIR)/.log/server.log 2>&1 & echo $$! > $(CURDIR)/.log/server.pid
	@echo "API → http://localhost:8765  |  log: .log/server.log"
	@echo "Starting TUI…"
	cd apps/tui && go run ./cmd/tui

stop:
	@if [ -f .log/server.pid ]; then \
		kill $$(cat .log/server.pid) 2>/dev/null && echo "API server stopped" || echo "API server already stopped"; \
		rm -f .log/server.pid; \
	fi

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
