package router

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
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

	r := gin.New()
	r.Use(middleware.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(cfg.CORSOrigin))
	r.Use(middleware.RateLimit(rate.Limit(60), 120))
	r.Use(middleware.Metrics())
	r.Use(middleware.AuditLogger())

	auth := middleware.Auth(middleware.NewAPIKeyAuth(cfg.APIKey))

	// Health — unauthenticated
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Metrics — unauthenticated (scrape from Prometheus/Grafana)
	r.GET("/metrics", middleware.MetricsHandler())

	svc := services.NewFileService(cfg.StorageRoot, cfg.MaxUploadSize)
	fh := handlers.NewFileHandler(svc)

	rc := handlers.InitRuntimeConfig(cfg)
	ch := handlers.NewConfigHandler(rc)

	v1 := r.Group("/api/v1", auth)
	{
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

		// Runtime config
		v1.GET("/config", ch.GetConfig)
		v1.PATCH("/config", ch.PatchConfig)
	}

	return r
}
