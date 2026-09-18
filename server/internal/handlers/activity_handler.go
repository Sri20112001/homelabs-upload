package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/activity"
	"github.com/homelab/filemanager/internal/middleware"
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

// DELETE /api/activity (admin — clear log)
func (h *ActivityHandler) Clear(c *gin.Context) {
	_, actor, _, _ := middleware.CurrentUser(c)
	if err := h.log.Clear(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": "cannot clear log"}})
		return
	}
	h.log.Log(activity.Entry{User: actor, Action: activity.ActionTrashPurge, Detail: "cleared activity log", IP: c.ClientIP(), Status: 200})
	c.JSON(http.StatusOK, gin.H{"message": "activity cleared"})
}
