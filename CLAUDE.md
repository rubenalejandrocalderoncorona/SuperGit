# SuperGit
Dual-interface GitHub repo browser: a Go HTTP API + TUI and a Next.js web app.

## Stack
- **Backend:** Go 1.24, `net/http` stdlib router, `go-github/v68`, `charmbracelet/bubbletea` TUI
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts
- **Package manager:** npm (web only — no pnpm/yarn)
- **Auth:** GitHub PAT via `GITHUB_TOKEN` env var or `~/.supergit/config.json`

## Key directories
- `apps/tui/` — Go server + TUI binary
  - `internal/api/` — HTTP handlers, types, middleware (CORS)
  - `internal/github/` — GitHub client wrapper
  - `internal/git/` — local repo scanner
  - `internal/config/` — config load/save (`~/.supergit/config.json`)
  - `cmd/server/` — `go run ./cmd/server` starts the API on :8765
  - `cmd/tui/` — `go run ./cmd/tui` launches the Bubble Tea TUI
- `apps/web/src/` — Next.js frontend
  - `app/` — App Router pages (`page.tsx` is the single page)
  - `components/` — Sidebar, TopBar, RepoGrid, RepoCard, PulseDashboard
  - `lib/api.ts` — all fetch calls to the Go server

## Commands
```
# Start Go API server (required for the web app)
cd apps/tui && go run ./cmd/server

# Start web dev server
cd apps/web && npm run dev

# Build Go binaries
cd apps/tui && go build ./...

# Build web
cd apps/web && npm run build
```

## Code style
- Go: standard `gofmt`, no external linters enforced — keep handlers clean, errors returned via `errJSON`
- TypeScript: named exports only (no default exports for components), `"use client"` at top of interactive components
- CSS: Tailwind utility classes + CSS custom properties via `--sg-*` variables defined in `globals.css`
- No test suite exists yet — manual verification via browser + `go build`

## Architecture decisions
- The Go server is the single source of truth; the web app never talks to GitHub directly
- "Delete" is session-local (in-memory `hiddenRepos` map) — repos reappear on server restart by design
- Local repos are deduplicated against GitHub repos by normalized remote URL
- Version is the constant `api.Version` in `apps/tui/internal/api/types.go` — update it for every release

## Gotchas
- Next.js version is **16** (App Router, React 19) — APIs differ from Next.js 13/14; read `node_modules/next/dist/docs/` before assuming conventions
- `apps/web/AGENTS.md` (loaded via CLAUDE.md `@AGENTS.md`) warns about this — always check it
- The Go router uses Go 1.22+ method+path pattern syntax (`"GET /api/path"`) — not compatible with older Go
- `hiddenRepos` in `handlers.go` is not persisted; it resets on server restart
- CSS variables are set on `<html data-theme="dark|light">` — components must use `var(--sg-*)` tokens, not hardcoded colors
