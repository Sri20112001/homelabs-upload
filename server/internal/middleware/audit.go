package middleware

import (
	"encoding/json"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/models"
)

var (
	auditMu   sync.Mutex
	auditFile *os.File
)

// InitAuditLog opens (or creates) the append-only audit log at logPath.
func InitAuditLog(logPath string) error {
	f, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	auditMu.Lock()
	auditFile = f
	auditMu.Unlock()
	return nil
}

// AuditLogger writes one JSON line per request to the audit log.
func AuditLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		auditMu.Lock()
		f := auditFile
		auditMu.Unlock()
		if f == nil {
			return
		}
		username := ""
		if v, ok := c.Get("username"); ok {
			if s, ok := v.(string); ok {
				username = s
			}
		}
		entry := models.AuditEntry{
			Time:   time.Now().UTC(),
			Method: c.Request.Method,
			Path:   c.Request.URL.Path,
			Status: c.Writer.Status(),
			IP:     c.ClientIP(),
			User:   username,
		}
		line, _ := json.Marshal(entry)
		auditMu.Lock()
		_, _ = f.Write(append(line, '\n'))
		auditMu.Unlock()
	}
}
