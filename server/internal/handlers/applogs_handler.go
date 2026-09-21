package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/applog"
)

type AppLogsHandler struct {
	log *applog.Store
}

func NewAppLogsHandler(log *applog.Store) *AppLogsHandler {
	return &AppLogsHandler{log: log}
}

// GET /api/app-logs?limit=&level=&q=&request_id=&since=
// Feed for the future log aggregator: structured request logs, newest first.
func (h *AppLogsHandler) List(c *gin.Context) {
	if h.log == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"code": "UNAVAILABLE", "message": "Log store unavailable."}})
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	res := h.log.List(applog.Query{
		Limit:     limit,
		Level:     c.Query("level"),
		Search:    c.Query("q"),
		RequestID: c.Query("request_id"),
		Since:     c.Query("since"),
	})
	c.JSON(http.StatusOK, res)
}

// Clear is intentionally unsupported: app logs are append-only and
// immutable (DB trigger rejects UPDATE/DELETE/TRUNCATE). Kept as an
// explicit 410 so old clients/admin scripts fail loudly instead of
// silently assuming logs were wiped.
func (h *AppLogsHandler) Clear(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{"error": gin.H{"code": "IMMUTABLE", "message": "App logs are append-only and cannot be cleared, altered, or deleted."}})
}
