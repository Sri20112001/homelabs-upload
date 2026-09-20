package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/middleware"
	"github.com/homelab/filemanager/internal/models"
	"github.com/homelab/filemanager/internal/services"
)

// DashboardHandler serves the dashboard's single data endpoint.
type DashboardHandler struct {
	svc *services.FileService
}

func NewDashboardHandler(svc *services.FileService) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

// Dashboard  GET /api/dashboard — disk usage + per-folder breakdown +
// server metrics in one round trip (replaces /storage, /storage/breakdown
// and the /metrics scrape on the dashboard).
func (h *DashboardHandler) Dashboard(c *gin.Context) {
	info, err := h.svc.StorageInfo()
	if err != nil {
		respondError(c, err)
		return
	}
	breakdown, err := h.svc.StorageBreakdown()
	if err != nil {
		respondError(c, err)
		return
	}
	folders := breakdown.Folders
	if folders == nil {
		folders = []models.FolderStat{}
	}
	c.JSON(http.StatusOK, models.DashboardResponse{
		Storage: *info,
		Folders: folders,
		Metrics: middleware.Snapshot(),
	})
}
