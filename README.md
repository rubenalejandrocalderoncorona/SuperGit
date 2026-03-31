# SuperGit

A dual-interface GitHub repository browser and analytics tool — GUI and TUI sharing a single Go REST API backend.

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

**2. Start the REST API server** (Terminal 1)
```bash
make server
# → http://localhost:8765
```

**3a. Start the GUI** (Terminal 2)
```bash
make web
# → http://localhost:3000
```

**3b. Or start the TUI** (Terminal 2)
```bash
make tui
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
