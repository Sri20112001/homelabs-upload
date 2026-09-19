package router

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/activity"
	"github.com/homelab/filemanager/internal/auth"
	"github.com/homelab/filemanager/internal/config"
	"github.com/homelab/filemanager/internal/handlers"
	"github.com/homelab/filemanager/internal/middleware"
	"github.com/homelab/filemanager/internal/services"
	"golang.org/x/time/rate"
)

func New(cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	auditPath := filepath.Join(filepath.Dir(cfg.StorageRoot), "access.log")
	if err := middleware.InitAuditLog(auditPath); err != nil {
		_, _ = os.Stderr.WriteString("audit log init failed: " + err.Error() + "\n")
	}

	// File-backed user + activity stores (sibling of STORAGE_ROOT).
	userStore, err := auth.NewStore(cfg.StorageRoot)
	if err != nil {
		_, _ = os.Stderr.WriteString("auth store init failed: " + err.Error() + "\n")
	}
	activityStore, err := activity.NewStore(cfg.StorageRoot)
	if err != nil {
		_, _ = os.Stderr.WriteString("activity store init failed: " + err.Error() + "\n")
	}

	r := gin.New()
	r.Use(middleware.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(cfg.CORSOrigin))
	r.Use(middleware.RateLimit(rate.Limit(60), 120))
	r.Use(middleware.Metrics())
	r.Use(middleware.AuditLogger())

	// Health — unauthenticated
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Metrics — unauthenticated (scrape from Prometheus/Grafana)
	r.GET("/metrics", middleware.MetricsHandler())

	svc := services.NewFileService(cfg.StorageRoot, cfg.MaxUploadSize)
	fh := handlers.NewFileHandler(svc, activityStore)
	ah := handlers.NewAuthHandler(userStore, activityStore)
	uh := handlers.NewUsersHandler(userStore, activityStore)
	ach := handlers.NewActivityHandler(activityStore)

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

		trash := v1.Group("/trash")
		trash.GET("", fh.TrashList)
		trash.POST("", fh.TrashMove)
		trash.POST("/restore", fh.TrashRestore)
		trash.DELETE("", fh.TrashPurge)

		// Activity — every user can read (shared transparency), only admin clears.
		v1.GET("/activity", ach.List)
		v1.DELETE("/activity", middleware.RequireAdmin(), ach.Clear)

		// Users — list + create for any logged-in user (no open
		// registration: accounts are created by existing users, and every
		// creation is activity-logged). Role changes and removal stay admin-only.
		v1.GET("/users", uh.List)
		v1.POST("/users", uh.Create)
		users := v1.Group("/users", middleware.RequireAdmin())
		users.PATCH("/:id", uh.Update)
		users.DELETE("/:id", uh.Delete)

		// Runtime config — admin only (was open to every member).
		rc := handlers.InitRuntimeConfig(cfg)
		ch := handlers.NewConfigHandler(rc)
		v1.GET("/config", middleware.RequireAdmin(), ch.GetConfig)
		v1.PATCH("/config", middleware.RequireAdmin(), ch.PatchConfig)
	}

	serveSPA(r)

	return r
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
		if base != "" {
			if p == "/" {
				c.Redirect(http.StatusFound, base+"/")
				return
			}
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
