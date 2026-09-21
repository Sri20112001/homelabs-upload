package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/applog"
	"github.com/rs/zerolog/log"
)

// Logger logs method, path, status, duration, and request ID for every request.
// The database (app_logs) is the authoritative store: every request persists
// a structured record via a non-blocking batched writer. stdout (zerolog) is
// a human mirror only. DB writes never stall requests: a saturated buffer
// sheds records instead of blocking (shed count via Writer.Dropped).
func Logger(w *applog.Writer) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start)
		status := c.Writer.Status()
		requestID := c.GetHeader("X-Request-ID")
		log.Info().
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Int("status", status).
			Dur("duration", duration).
			Str("request_id", requestID).
			Msg("request")
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
			Level:      applog.LevelForStatus(status),
			Service:    "backend",
			Message:    "request",
			RequestID:  requestID,
			Method:     c.Request.Method,
			Path:       c.Request.URL.Path,
			Status:     status,
			DurationMs: duration.Milliseconds(),
			Username:   username,
			IP:         c.ClientIP(),
		})
	}
}

// Recovery catches panics, persists an error record when w != nil, and
// returns a structured JSON error.
func Recovery(w *applog.Writer) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Error().Interface("panic", r).Msg("recovered from panic")
				if w != nil {
					w.Log(applog.Record{
						Level:     applog.LevelError,
						Service:   "backend",
						Message:   "panic recovered",
						RequestID: c.GetHeader("X-Request-ID"),
						Method:    c.Request.Method,
						Path:      c.Request.URL.Path,
						Status:    http.StatusInternalServerError,
						IP:        c.ClientIP(),
					})
				}
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": gin.H{
						"code":    "INTERNAL_ERROR",
						"message": "Internal server error.",
					},
				})
			}
		}()
		c.Next()
	}
}
