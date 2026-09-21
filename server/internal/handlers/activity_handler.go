package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/activity"
)

type ActivityHandler struct {
	log *activity.Store
}

func NewActivityHandler(log *activity.Store) *ActivityHandler {
	return &ActivityHandler{log: log}
}

// GET /api/activity?limit=&user=&action=&q=
func (h *ActivityHandler) List(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	res := h.log.List(activity.Query{
		Limit:  limit,
		User:   c.Query("user"),
		Action: c.Query("action"),
		Search: c.Query("q"),
	})
	c.JSON(http.StatusOK, res)
}

// Clear is intentionally unsupported: the activity log is append-only and
// immutable (DB trigger rejects UPDATE/DELETE/TRUNCATE). Kept as an
// explicit 410 so old clients fail loudly instead of silently assuming
// the log was wiped.
func (h *ActivityHandler) Clear(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{"error": gin.H{"code": "IMMUTABLE", "message": "Activity log is append-only and cannot be cleared, altered, or deleted."}})
}
