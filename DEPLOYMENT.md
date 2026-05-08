# Deployment — OrangePi5+

SuperGit is deployed on an OrangePi5+ running Armbian, exposed via a Cloudflare tunnel.

## Server

| Property | Value |
|----------|-------|
| Board | OrangePi5+ |
| OS | Armbian 25.11.1 (Debian trixie, aarch64) |
| SSH | `ssh -o ProxyCommand="/opt/homebrew/bin/cloudflared access ssh --hostname %h" racc@ssh.04071970.xyz` |

## Dependencies installed

| Tool | Version | How |
|------|---------|-----|
| Go | 1.24.3 | Official binary from go.dev, extracted to `/usr/local/go` |
| Node.js | 20.x | `apt install nodejs npm` |
| git | 2.47 | `apt install git` |

Go is available at `/usr/local/go/bin/go`. `~/.bashrc` exports it on PATH.

## Repository

```
~/supergit/        ← git clone of github.com/rubenalejandrocalderoncorona/SuperGit
```

Cloned from the public GitHub repo; no deploy key required.

## Systemd services

Two services are registered and enabled (`systemctl enable`):

| Service | Binary / command | Port | Depends on |
|---------|-----------------|------|------------|
| `supergit-api` | `~/supergit/apps/tui/bin/supergit-server` | 8765 | — |
| `supergit-web` | `npm run start -- -p 3000 -H 127.0.0.1` | 3000 | `supergit-api` |

Unit files live at `/etc/systemd/system/supergit-api.service` and `supergit-web.service`.

```bash
# Status
sudo systemctl status supergit-api supergit-web

# Logs
sudo journalctl -u supergit-api -n 50
sudo journalctl -u supergit-web -n 50
```

## Environment and configuration

**`~/.supergit-env`** (sourced by both services via `EnvironmentFile=`):
```
GITHUB_TOKEN=ghp_...
```
File is `chmod 600`. Update this when rotating your PAT.

**`~/.supergit/config.json`** (runtime config):
```json
{
  "scan_dirs": [],
  "server_port": 8765
}
```

**`~/.supergit/users.json`** (multi-user store, created on first use):
```json
{
  "active": "rubenalejandrocalderoncorona",
  "users": [
    { "username": "rubenalejandrocalderoncorona", "token": "ghp_..." }
  ]
}
```

## Next.js build configuration

The production Next.js build bakes in the API URL at build time via:

```
NEXT_PUBLIC_API_URL=https://supergit-api.04071970.xyz
```

This is set in the `supergit-web` systemd unit (`Environment=`) and in `deploy.sh`.

## Cloudflare tunnel

The existing tunnel token runs as `cloudflared.service`. Two public hostnames are configured in the Cloudflare Zero Trust dashboard (Networks → Tunnels → Public Hostnames):

| Hostname | Service |
|----------|---------|
| `supergit.04071970.xyz` | `http://localhost:3000` (Next.js) |
| `supergit-api.04071970.xyz` | `http://localhost:8765` (Go API) |

## Updating / redeploying

```bash
~/supergit/deploy.sh
```

This script:
1. `git pull origin main`
2. Builds the Go server binary (`go build`)
3. `npm install` + `npm run build` (with `NEXT_PUBLIC_API_URL` set)
4. `sudo systemctl restart supergit-api supergit-web`
