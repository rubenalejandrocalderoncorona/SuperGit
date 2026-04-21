# SuperGit

A dual-interface GitHub repository browser and analytics tool — GUI and TUI sharing a single Go REST API backend.

## Running the App

> **Requires:** Go 1.22+, Node.js 18+, npm, and the [gh CLI](https://cli.github.com/) authenticated (`gh auth login`).

```bash
make install   # first time only — installs web dependencies
make web       # API server (background) + Next.js GUI (foreground)
# — or —
make tui       # API server (background) + Bubble Tea TUI (foreground)
```

- API → http://localhost:8765
- Web UI → http://localhost:3000 *(only when using `make web`)*
- API log → `.log/server.log`

```bash
make stop      # stops the background API server
```

---

## Project Structure

```
SuperGit/
├── apps/
│   ├── tui/        # Go — REST API server + Bubble Tea TUI
│   └── web/        # Next.js 16 + Tailwind CSS — GUI
└── Makefile
```

## Prerequisites

- Go 1.22+
- Node.js 18+ and npm
- [gh CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)

## Quick Start

**1. Install web dependencies**
```bash
make install
```

**2. Launch** — pick one interface:
```bash
make web   # GUI  → http://localhost:3000  (API auto-started in background)
make tui   # TUI  (API auto-started in background)
```

## REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/version` | Version + repo URL |
| GET | `/api/repos` | GitHub + local repos merged |
| GET | `/api/repos/{owner}/{repo}/commits` | Commit history (30d) |
| GET | `/api/repos/{owner}/{repo}/pulse` | Analytics dashboard data |

Default port: **8765** — override with `SUPERGIT_PORT` env var.

## Configuration

Config file is auto-created at `~/.supergit/config.json`:

```json
{
  "scan_dirs": ["~/Documents/PersonalRepos"],
  "server_port": 8765
}
```

GitHub token is read from the `gh` CLI keyring (`gh auth token`).  
Override with the `GITHUB_TOKEN` environment variable if needed.

## Build

```bash
make build-go   # builds apps/tui/bin/supergit-server and supergit-tui
make build-web  # production Next.js build
make all        # both
```

## TUI Keybindings

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `l` / `→` | Focus main pane |
| `h` / `←` | Focus sidebar |
| `o` | Open repo in browser |
| `p` | Pulse dashboard |
| `/` | Search |
| `r` | Refresh repos |
| `?` | Toggle help |
| `q` | Quit |

## GUI Features

- **macOS Finder aesthetic** — glassmorphism cards, SF Pro font stack, dark blue palette
- **Sidebar** — repo list with search and filtering
- **Repo Grid** — cards with language badges, star count, last commit time
- **Pulse Dashboard** — 30-day commit bar chart, most active day, peak window stats
- **Version Button** — top-right `v1.0.0` button opens this repository
