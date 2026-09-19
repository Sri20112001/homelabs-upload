# NOTE: build context is the REPO ROOT (see docker-compose `build.context`).
# ── Frontend stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend

# Subpath the UI is served under ("" = domain root). No VITE_API_URL here on
# purpose: same-origin serving uses root-absolute /api.
ARG APP_BASE_PATH=/nodevault/
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Backend build stage ────────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder

WORKDIR /src/server
COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/filemanager ./cmd/server

# ── Runtime stage ──────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates curl

COPY --from=builder /app/filemanager /app/filemanager
COPY --from=frontend /app/client/dist /app/dist
WORKDIR /app

EXPOSE 8080
VOLUME ["/data/files"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/filemanager"]
