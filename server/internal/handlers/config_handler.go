package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/activity"
	"github.com/homelab/filemanager/internal/config"
	"github.com/homelab/filemanager/internal/middleware"
)

// RuntimeConfig holds the mutable subset of Config that can be changed at runtime.
type RuntimeConfig struct {
	mu            sync.RWMutex
	StorageRoot   string `json:"storage_root"`
	MaxUploadSize int64  `json:"max_upload_size"`
	CORSOrigin    string `json:"cors_origin"`
}

var globalRuntimeCfg *RuntimeConfig

// InitRuntimeConfig seeds the runtime config from the loaded config.
func InitRuntimeConfig(cfg *config.Config) *RuntimeConfig {
	globalRuntimeCfg = &RuntimeConfig{
		StorageRoot:   cfg.StorageRoot,
		MaxUploadSize: cfg.MaxUploadSize,
		CORSOrigin:    cfg.CORSOrigin,
	}
	return globalRuntimeCfg
}

// GetRuntimeConfig returns the current runtime config snapshot.
func GetRuntimeConfig() (string, int64, string) {
	if globalRuntimeCfg == nil {
		return "", 0, ""
	}
	globalRuntimeCfg.mu.RLock()
	defer globalRuntimeCfg.mu.RUnlock()
	return globalRuntimeCfg.StorageRoot, globalRuntimeCfg.MaxUploadSize, globalRuntimeCfg.CORSOrigin
}

// ConfigHandler handles GET and PATCH /api/config.
// Every PATCH is appended to the immutable activity log (who changed what).
type ConfigHandler struct {
	rc  *RuntimeConfig
	log *activity.Store
}

func NewConfigHandler(rc *RuntimeConfig, log *activity.Store) *ConfigHandler {
	return &ConfigHandler{rc: rc, log: log}
}

// GetConfig  GET /api/config
func (h *ConfigHandler) GetConfig(c *gin.Context) {
	h.rc.mu.RLock()
	defer h.rc.mu.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"storage_root":    h.rc.StorageRoot,
		"max_upload_size": h.rc.MaxUploadSize,
		"cors_origin":     h.rc.CORSOrigin,
	})
}

// PatchConfig  PATCH /api/config
func (h *ConfigHandler) PatchConfig(c *gin.Context) {
	var req struct {
		StorageRoot   *string `json:"storage_root"`
		MaxUploadSize *int64  `json:"max_upload_size"`
		CORSOrigin    *string `json:"cors_origin"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": "invalid JSON"}})
		return
	}

	h.rc.mu.Lock()
	defer h.rc.mu.Unlock()

	var changed []string
	if req.StorageRoot != nil {
		info, err := os.Stat(*req.StorageRoot)
		if err != nil || !info.IsDir() {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_PATH", "message": "storage_root must be an existing directory"}})
			return
		}
		if *req.StorageRoot != h.rc.StorageRoot {
			changed = append(changed, "storage_root="+*req.StorageRoot)
		}
		h.rc.StorageRoot = *req.StorageRoot
	}
	if req.MaxUploadSize != nil && *req.MaxUploadSize > 0 {
		if *req.MaxUploadSize != h.rc.MaxUploadSize {
			changed = append(changed, fmt.Sprintf("max_upload_size=%d", *req.MaxUploadSize))
		}
		h.rc.MaxUploadSize = *req.MaxUploadSize
	}
	if req.CORSOrigin != nil {
		if *req.CORSOrigin != h.rc.CORSOrigin {
			changed = append(changed, "cors_origin="+*req.CORSOrigin)
		}
		h.rc.CORSOrigin = *req.CORSOrigin
	}

	// Config changes are security-sensitive: append to the immutable log.
	if h.log != nil {
		_, actor, _, role := middleware.CurrentUser(c)
		if actor == "" {
			actor = "unknown"
		}
		detail := strings.Join(changed, ", ")
		if detail == "" {
			detail = "no changes"
		}
		h.log.Log(activity.Entry{
			User: actor, Role: role, Action: activity.ActionConfigChange,
			Path: "/api/config", Detail: "config updated: " + detail,
			IP: c.ClientIP(), Status: http.StatusOK,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "config updated",
		"storage_root":    h.rc.StorageRoot,
		"max_upload_size": h.rc.MaxUploadSize,
		"cors_origin":     h.rc.CORSOrigin,
	})
}
