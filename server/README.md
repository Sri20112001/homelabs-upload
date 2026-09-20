# NodeVault — Backend

A production-quality REST API for a self-hosted file manager, built with Go and Gin. The filesystem is the source of truth — no database required.

---

## Requirements

- Go 1.22+
- Docker (optional)

---

## Installation

```bash
git clone <repo>
cd backend
go mod download
```

---

## Configuration

Copy `.env.example` to `.env` and adjust values:

| Variable          | Default                   | Description                          |
|-------------------|---------------------------|--------------------------------------|
| `SERVER_HOST`     | `0.0.0.0`                 | Bind address                         |
| `SERVER_PORT`     | `8080`                    | Listen port                          |
| `STORAGE_ROOT`    | `/data/files`             | Absolute path to the storage root    |
| `MAX_UPLOAD_SIZE` | `10737418240` (10 GiB)    | Maximum upload size in bytes         |
| `CORS_ORIGIN`     | `http://localhost:5173`   | Allowed frontend origin              |
| `API_KEY`         | *(empty)*                 | Static bearer token; empty = no auth |
| `DATABASE_URL`    | compose pg service        | Postgres DSN (mandatory)             |

The server **fails fast** if `STORAGE_ROOT` does not exist or is not a directory.

---

## Running Locally

```bash
cp .env.example .env
# edit .env — set STORAGE_ROOT to an existing directory,
# and DATABASE_URL to a reachable Postgres
go run ./cmd/server
```

A Postgres must be reachable (the database is mandatory — boot fails fast
without it). Easiest local option: `docker compose up -d postgres`, which
uses the compose defaults (`nodevault/nodevault`, db `nodevault`).

---

## Running with Docker

```bash
docker compose up --build
```

Uploads and `access.log` live in the `nodevault-data` named volume (mounted
at `/data`); all users, sessions, activity and app logs live in Postgres
(`pgdata` volume). Named volumes survive `docker compose down`, rebuilds
and CI redeploys.

To keep data at a custom host path outside the checkout instead, set in
`server/.env` (one or both):

```bash
DATA_DIR=/srv/nodevault/data      # uploads + access.log
PGDATA_DIR=/srv/nodevault/pgdata  # postgres data (pre-create: mkdir -p … && chown -R 999:999 …)
```

For local `go run` (no Docker), `STORAGE_ROOT` is the same knob: point it at
any directory and the `.nodevault/` db dir plus `access.log` are created next
to it, e.g. `STORAGE_ROOT=D:\NodeVaultData\files` (Windows) or
`STORAGE_ROOT=/srv/nodevault/data/files` (Linux).

---

## Authentication

Multi-user logins with per-user activity logging.
Users, sessions, the activity log and the app log live in Postgres
(tables auto-migrated on boot via GORM AutoMigrate) — all stores go through
GORM, so there is exactly one database backend to maintain.

- First run: `POST /api/auth/setup {username, display_name, password}` creates
  the admin (the login page does this for you).
- Then: `POST /api/auth/login {username, password}` sets an HttpOnly
  `nv_session` cookie (`SameSite=Lax`, 30 days, `Secure` auto-enabled on HTTPS)
  — the browser sends it automatically, including downloads and the SSE watcher.
- `Authorization: Bearer <token>` and `?token=` still work for scripts and old
  clients; legacy `API_KEY`, if set, is accepted the same way.
- Cookie-authenticated mutations are CSRF-guarded (Origin-vs-host check,
  `internal/middleware/csrf.go`); cross-origin frontends need
  `credentials: 'include'` and the exact `CORS_ORIGIN`.
- Roles: `admin` manages members (`/api/users`) and runtime config;
  `member` uses files and reads the activity feed (`GET /api/activity`).
- Legacy `API_KEY`, if set, still works as an admin bearer for scripts.

The `Authenticator` interface in `internal/middleware/recovery.go` lets you swap
the session strategy (JWT, OAuth, etc.) without changing handlers or services.

---

## API Reference

All routes are prefixed with `/api`.

### Health

```
GET /health
```

Unauthenticated. Returns status, UTC timestamp, process uptime and a DB
reachability check — `200` when healthy, `503` when the database is down:

```json
{"status":"ok","timestamp":"2026-09-20T10:00:00Z","uptimeSec":12345,"checks":{"db":"up"}}
```

### App logs (aggregator feed)

Every request is persisted as a structured record (level, method, path,
status, duration, user, IP, request id) via a non-blocking batched writer —
queryable for log aggregation alongside the activity feed:

```
GET /api/app-logs?limit=100&level=error&q=upload&request_id=&since=2026-09-20T00:00:00Z
DELETE /api/app-logs   (admin only)
```

### List Directory

```
GET /api/files?path=/Documents
```

### File Metadata

```
GET /api/files/metadata?path=/Documents/report.pdf
```

### Download

```
GET /api/files/download?path=/Documents/report.pdf
```

### Upload

```
POST /api/files/upload?path=/Documents
Content-Type: multipart/form-data
field: file
```

Returns `409 Conflict` if the file already exists.

### Create Directory

```
POST /api/directories
{"path": "/Documents/New Folder"}
```

### Rename

```
PATCH /api/files
{"path": "/Documents/old.txt", "new_name": "new.txt"}
```

### Move

```
POST /api/files/move
{"source": "/Documents/file.txt", "destination": "/Backup/file.txt"}
```

### Copy

```
POST /api/files/copy
{"source": "/Documents/file.txt", "destination": "/Backup/file.txt"}
```

### Delete

```
DELETE /api/files
{"path": "/Documents/file.txt"}

# Directory (must be explicit)
{"path": "/Documents/old-folder", "recursive": true}
```

### Search

```
GET /api/search?q=report&path=/Documents
```

### Storage Info

```
GET /api/storage
```

### Dashboard (single call)

```
GET /api/dashboard
```

Disk usage + per-folder breakdown + server metrics in one round trip —
what the dashboard renders (replaces separate `/storage`,
`/storage/breakdown` and `/metrics` calls).

---

## Example curl Commands

```bash
# Health check
curl http://localhost:8080/health

# List root
curl "http://localhost:8080/api/files?path=/"

# List subdirectory
curl "http://localhost:8080/api/files?path=/Documents"

# File metadata
curl "http://localhost:8080/api/files/metadata?path=/Documents/report.pdf"

# Download
curl -O "http://localhost:8080/api/files/download?path=/Documents/report.pdf"

# Upload
curl -X POST \
  -F "file=@./example.pdf" \
  "http://localhost:8080/api/files/upload?path=/Documents"

# Create directory
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"path":"/Documents/New Folder"}' \
  http://localhost:8080/api/directories

# Rename
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"path":"/Documents/old.txt","new_name":"new.txt"}' \
  http://localhost:8080/api/files

# Move
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"source":"/Documents/file.txt","destination":"/Backup/file.txt"}' \
  http://localhost:8080/api/files/move

# Copy
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"source":"/Documents/file.txt","destination":"/Backup/file.txt"}' \
  http://localhost:8080/api/files/copy

# Delete file
curl -X DELETE \
  -H "Content-Type: application/json" \
  -d '{"path":"/Documents/file.txt"}' \
  http://localhost:8080/api/files

# Delete directory (recursive)
curl -X DELETE \
  -H "Content-Type: application/json" \
  -d '{"path":"/Documents/old-folder","recursive":true}' \
  http://localhost:8080/api/files

# Search
curl "http://localhost:8080/api/search?q=report&path=/Documents"

# Storage info
curl http://localhost:8080/api/storage

# With API key
curl -H "Authorization: Bearer mysecretkey" \
  "http://localhost:8080/api/files?path=/"
```

---

## Security Considerations

- **Path traversal**: every user-supplied path is resolved through `ResolveSafePath`, which cleans the path, joins it to `STORAGE_ROOT`, and verifies the result stays inside the root — including after symlink resolution.
- **Absolute paths**: the server never returns `STORAGE_ROOT` or any absolute filesystem path to clients.
- **Upload safety**: files are written to a `.tmp` file first and atomically renamed on success; partial uploads are cleaned up on failure.
- **Upload size**: enforced via `io.LimitReader` before any data reaches disk.
- **Streaming**: uploads and downloads use `io.Copy` — large files are never fully loaded into memory.
- **API key**: if `API_KEY` is set, all `/api` routes require `Authorization: Bearer <key>`. Do not use an empty key in production.

---

## Development Commands

```bash
go fmt ./...
go vet ./...
go build ./...
go test ./...
```

---

## Testing

```bash
go test ./...
```

Unit tests can be added under each package. The layered architecture (filesystem → service → handler) makes it straightforward to inject fakes at the service boundary.
