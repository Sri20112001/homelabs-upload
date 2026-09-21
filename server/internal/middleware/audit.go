package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/applog"
)

// All logs live in Postgres (tables: app_logs, activity). There is no
// file audit log: the former access.log duplicate has been removed so the
// database is the single, append-only source of truth.
//
// InitAuditLog is a deprecated no-op kept for backward compatibility —
// older call sites invoked it to open access.log. It does nothing now.
func InitAuditLog(_ string) error { return nil }

// AuditLogger persists one structured record per request to app_logs via
// the shared non-blocking writer. Logger() already does this; AuditLogger
// is kept as an explicit, separately-named stage so audit coverage never
// depends on one middleware being wired — both write to the same DB table.
// Safe to call with a nil writer (no-op).
func AuditLogger(w *applog.Writer) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		if w == nil {
			return
		}
		username := ""
		if v, ok := c.Get("username"); ok {
			if s, ok := v.(string); ok {
				username = s
			}
		}
		w.Log(applog.Record{
			Level:     applog.LevelForStatus(c.Writer.Status()),
			Service:   "backend",
			Message:   "audit",
			RequestID: c.GetHeader("X-Request-ID"),
			Method:    c.Request.Method,
			Path:      c.Request.URL.Path,
			Status:    c.Writer.Status(),
			Username:  username,
			IP:        c.ClientIP(),
		})
	}
}
