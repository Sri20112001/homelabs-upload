package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/applog"
	"github.com/homelab/filemanager/internal/middleware"
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

// DELETE /api/app-logs (admin — clear log)
func (h *AppLogsHandler) Clear(c *gin.Context) {
	if h.log == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"code": "UNAVAILABLE", "message": "Log store unavailable."}})
		return
	}
	if err := h.log.Clear(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "cannot clear log"}})
		return
	}
	_, actor, _, _ := middleware.CurrentUser(c)
	c.JSON(http.StatusOK, gin.H{"message": "app logs cleared by " + actor})
}
