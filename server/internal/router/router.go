package router

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/activity"
	"github.com/homelab/filemanager/internal/applog"
	"github.com/homelab/filemanager/internal/auth"
	"github.com/homelab/filemanager/internal/config"
	"github.com/homelab/filemanager/internal/handlers"
	"github.com/homelab/filemanager/internal/middleware"
	"github.com/homelab/filemanager/internal/services"
	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
)

// startedAt marks process boot for the /health uptime counter.
var startedAt = time.Now()

// New wires the full server. All logs live in Postgres (app_logs +
// activity, both append-only and immutable) — stdout/stderr stay as a
// human mirror only, never the source of truth.
//
// It returns the engine plus the app-log writer so main can flush pending
// log batches on graceful shutdown (Writer.Close drains the channel —
// without it, buffered records would be lost on SIGTERM).
func New(cfg *config.Config) (*gin.Engine, *applog.Writer) {
	gin.SetMode(gin.ReleaseMode)

	// Postgres-backed stores. The database is mandatory: fail fast here
	// rather than serving 500s on every route.
	userStore, err := auth.NewStore(cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("auth store init failed")
	}
	activityStore, err := activity.NewStore(cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("activity store init failed")
	}
	appLogStore, err := applog.NewStore(cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("app log store init failed")
	}
	// Async batched writer: request logs reach the DB without ever
	// blocking the request path.
	appLogWriter := applog.NewWriter(appLogStore)
	log.Info().Msg("postgres connected")
	// Persist the lifecycle event itself: boot is part of the audit trail.
	appLogWriter.Log(applog.Record{
		Level:   applog.LevelInfo,
		Service: "backend",
		Message: "server starting",
	})

	r := gin.New()
	r.Use(middleware.Recovery(appLogWriter))
	r.Use(middleware.Logger(appLogWriter))
	r.Use(middleware.CORS(cfg.CORSOrigin))
	r.Use(middleware.RateLimit(rate.Limit(60), 120))
	r.Use(middleware.Metrics())
	// Second DB audit stage (same app_logs table): coverage never depends
	// on a single middleware being wired.
	r.Use(middleware.AuditLogger(appLogWriter))

	// Health — unauthenticated. 200 when the DB pings, 503 otherwise
	// (Docker HEALTHCHECK and deploy gates key off the status code).
	r.GET("/health", func(c *gin.Context) {
		db := "up"
		status, code := "ok", http.StatusOK
		if userStore == nil || userStore.Ping() != nil {
			db, status, code = "down", "degraded", http.StatusServiceUnavailable
		}
		c.JSON(code, gin.H{
			"status":    status,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"uptimeSec": int64(time.Since(startedAt).Seconds()),
			"checks":    gin.H{"db": db},
		})
	})

	// Metrics — unauthenticated (scrape from Prometheus/Grafana)
	r.GET("/metrics", middleware.MetricsHandler())

	svc := services.NewFileService(cfg.StorageRoot, cfg.MaxUploadSize)
	fh := handlers.NewFileHandler(svc, activityStore)
	ah := handlers.NewAuthHandler(userStore, activityStore)
	uh := handlers.NewUsersHandler(userStore, activityStore)
	ach := handlers.NewActivityHandler(activityStore)
	alh := handlers.NewAppLogsHandler(appLogStore)
	dh := handlers.NewDashboardHandler(svc)

	// Public auth endpoints (login + first-run setup).
	r.GET("/api/auth/status", ah.Status)
	r.POST("/api/auth/setup", ah.Setup)
	r.POST("/api/auth/login", ah.Login)

	authMw := middleware.Auth(middleware.NewSessionAuth(userStore, cfg.APIKey))

	v1 := r.Group("/api", authMw)
	// CSRF check for cookie-authenticated mutations (runs after auth).
	v1.Use(middleware.CSRF(cfg.CORSOrigin))
	{
		v1.POST("/auth/logout", ah.Logout)
		v1.GET("/auth/me", ah.Me)

		files := v1.Group("/files")
		files.GET("", fh.ListDirectory)
		files.GET("/metadata", fh.GetMetadata)
		files.GET("/download", fh.Download)
		files.GET("/size", fh.FolderSize)
		files.GET("/watch", fh.WatchDirectory)
		files.POST("/upload", fh.Upload)
		files.POST("/move", fh.Move)
		files.POST("/copy", fh.Copy)
		files.POST("/zip", fh.ZipDownload)
		files.POST("/chunk", fh.UploadChunk)
		files.POST("/chunk/finalize", fh.FinalizeChunk)
		files.POST("/bulk-rename", fh.BulkRename)
		files.PATCH("", fh.Rename)
		files.DELETE("", fh.Delete)

		v1.POST("/directories", fh.CreateDirectory)
		v1.GET("/search", fh.Search)
		v1.GET("/storage", fh.StorageInfo)
		v1.GET("/storage/breakdown", fh.StorageBreakdown)
		// Single dashboard payload: storage + folders + metrics.
		v1.GET("/dashboard", dh.Dashboard)

		trash := v1.Group("/trash")
		trash.GET("", fh.TrashList)
		trash.POST("", fh.TrashMove)
		trash.POST("/restore", fh.TrashRestore)
		trash.DELETE("", fh.TrashPurge)

		// Activity — append-only and immutable: every user can read,
		// nobody (not even admins) can clear, alter, or delete.
		// DELETE stays wired to an explicit 410 so old clients fail loudly.
		v1.GET("/activity", ach.List)
		v1.DELETE("/activity", ach.Clear)

		// App logs — structured request log for the future aggregator.
		// Same immutability as activity: read-only for every user.
		v1.GET("/app-logs", alh.List)
		v1.DELETE("/app-logs", alh.Clear)

		// Users — list + create for any logged-in user (no open
		// registration: accounts are created by existing users, and every
		// creation is activity-logged). Role changes and removal stay admin-only.
		v1.GET("/users", uh.List)
		v1.POST("/users", uh.Create)
		users := v1.Group("/users", middleware.RequireAdmin())
		users.PATCH("/:id", uh.Update)
		users.DELETE("/:id", uh.Delete)

		// Runtime config — admin only (was open to every member).
		// Every PATCH is appended to the immutable activity log.
		rc := handlers.InitRuntimeConfig(cfg)
		ch := handlers.NewConfigHandler(rc, activityStore)
		v1.GET("/config", middleware.RequireAdmin(), ch.GetConfig)
		v1.PATCH("/config", middleware.RequireAdmin(), ch.PatchConfig)
	}

	serveSPA(r)

	return r, appLogWriter
}

// serveSPA serves the built frontend (./dist, baked into the image) so one
// origin hosts UI + API: no CORS, no mixed-content. API/health/metrics
// routes above take precedence. Anything else serves index.html (SPA
// fallback); unknown /api/* paths stay JSON 404s. Skipped when ./dist is
// absent (e.g. local `go run` dev — API-only mode).
//
// APP_BASE_PATH (e.g. "/nodevault") serves the UI under a subpath so one
// domain can front several projects. Only static assets/routes move — the
// API intentionally stays at root /api in every mode (direct, gateway with
// prefix-stripping, Vercel), so no client or proxy changes are ever needed
// for API calls. With a base set, "/" redirects to it.
func serveSPA(r *gin.Engine) {
	if _, err := os.Stat("./dist/index.html"); err != nil {
		return
	}
	base := strings.TrimSuffix(os.Getenv("APP_BASE_PATH"), "/")
	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		// NOTE: no "/" → base redirect here on purpose. A prefix-stripping
		// gateway turns /nodevault/ back into "/" — redirecting would loop
		// forever. "/" serves the shell directly; the subpath is canonical
		// by convention, not by force.
		if base != "" {
			if p == base {
				p = "/"
			} else if strings.HasPrefix(p, base+"/") {
				p = p[len(base):]
			}
		}
		fp := filepath.Join("./dist", filepath.Clean("/"+p))
		if fi, err := os.Stat(fp); err == nil && !fi.IsDir() {
			c.File(fp)
			return
		}
		c.File("./dist/index.html")
	})
}
