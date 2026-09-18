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

The server **fails fast** if `STORAGE_ROOT` does not exist or is not a directory.

---

## Running Locally

```bash
cp .env.example .env
# edit .env — set STORAGE_ROOT to an existing directory
go run ./cmd/server
```

---

## Running with Docker

```bash
docker compose up --build
```

Storage is mounted at `./data` → `/data/files` inside the container.

---

## Authentication

If `API_KEY` is set, every request must include:

```
Authorization: Bearer <api-key>
```

Leave `API_KEY` empty to disable authentication during local development.

The `Authenticator` interface in `internal/middleware/recovery.go` is designed to be replaced with a full auth implementation (JWT, OAuth, etc.) without changing handlers or services.

---

## API Reference

All routes are prefixed with `/api/v1`.

### Health

```
GET /health
```

### List Directory

```
GET /api/v1/files?path=/Documents
```

### File Metadata

```
GET /api/v1/files/metadata?path=/Documents/report.pdf
```

### Download

```
GET /api/v1/files/download?path=/Documents/report.pdf
```

### Upload

```
POST /api/v1/files/upload?path=/Documents
Content-Type: multipart/form-data
field: file
```

Returns `409 Conflict` if the file already exists.

### Create Directory

```
POST /api/v1/directories
{"path": "/Documents/New Folder"}
```

### Rename

```
PATCH /api/v1/files
{"path": "/Documents/old.txt", "new_name": "new.txt"}
```

### Move

```
POST /api/v1/files/move
{"source": "/Documents/file.txt", "destination": "/Backup/file.txt"}
```

### Copy

```
POST /api/v1/files/copy
{"source": "/Documents/file.txt", "destination": "/Backup/file.txt"}
```

### Delete

```
DELETE /api/v1/files
{"path": "/Documents/file.txt"}

# Directory (must be explicit)
{"path": "/Documents/old-folder", "recursive": true}
```

### Search

```
GET /api/v1/search?q=report&path=/Documents
```

### Storage Info

```
GET /api/v1/storage
```

---

## Example curl Commands

```bash
# Health check
curl http://localhost:8080/health

# List root
curl "http://localhost:8080/api/v1/files?path=/"

# List subdirectory
curl "http://localhost:8080/api/v1/files?path=/Documents"

# File metadata
curl "http://localhost:8080/api/v1/files/metadata?path=/Documents/report.pdf"

# Download
curl -O "http://localhost:8080/api/v1/files/download?path=/Documents/report.pdf"

# Upload
curl -X POST \
  -F "file=@./example.pdf" \
  "http://localhost:8080/api/v1/files/upload?path=/Documents"

# Create directory
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"path":"/Documents/New Folder"}' \
  http://localhost:8080/api/v1/directories

# Rename
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"path":"/Documents/old.txt","new_name":"new.txt"}' \
  http://localhost:8080/api/v1/files

# Move
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"source":"/Documents/file.txt","destination":"/Backup/file.txt"}' \
  http://localhost:8080/api/v1/files/move

# Copy
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"source":"/Documents/file.txt","destination":"/Backup/file.txt"}' \
  http://localhost:8080/api/v1/files/copy

# Delete file
curl -X DELETE \
  -H "Content-Type: application/json" \
  -d '{"path":"/Documents/file.txt"}' \
  http://localhost:8080/api/v1/files

# Delete directory (recursive)
curl -X DELETE \
  -H "Content-Type: application/json" \
  -d '{"path":"/Documents/old-folder","recursive":true}' \
  http://localhost:8080/api/v1/files

# Search
curl "http://localhost:8080/api/v1/search?q=report&path=/Documents"

# Storage info
curl http://localhost:8080/api/v1/storage

# With API key
curl -H "Authorization: Bearer mysecretkey" \
  "http://localhost:8080/api/v1/files?path=/"
```

---

## Security Considerations

- **Path traversal**: every user-supplied path is resolved through `ResolveSafePath`, which cleans the path, joins it to `STORAGE_ROOT`, and verifies the result stays inside the root — including after symlink resolution.
- **Absolute paths**: the server never returns `STORAGE_ROOT` or any absolute filesystem path to clients.
- **Upload safety**: files are written to a `.tmp` file first and atomically renamed on success; partial uploads are cleaned up on failure.
- **Upload size**: enforced via `io.LimitReader` before any data reaches disk.
- **Streaming**: uploads and downloads use `io.Copy` — large files are never fully loaded into memory.
- **API key**: if `API_KEY` is set, all `/api/v1` routes require `Authorization: Bearer <key>`. Do not use an empty key in production.

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
