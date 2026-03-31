.PHONY: server tui web build-go build-web all

# ── Development ────────────────────────────────────────────────────
server:
	cd apps/tui && go run ./cmd/server

tui:
	cd apps/tui && go run ./cmd/tui

web:
	cd apps/web && npm run dev

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
