package handlers

import (
	"net/http"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/config"
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

// ConfigHandler handles GET and PATCH /api/v1/config
type ConfigHandler struct {
	rc *RuntimeConfig
}

func NewConfigHandler(rc *RuntimeConfig) *ConfigHandler {
	return &ConfigHandler{rc: rc}
}

// GetConfig  GET /api/v1/config
func (h *ConfigHandler) GetConfig(c *gin.Context) {
	h.rc.mu.RLock()
	defer h.rc.mu.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"storage_root":    h.rc.StorageRoot,
		"max_upload_size": h.rc.MaxUploadSize,
		"cors_origin":     h.rc.CORSOrigin,
	})
}

// PatchConfig  PATCH /api/v1/config
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

	if req.StorageRoot != nil {
		info, err := os.Stat(*req.StorageRoot)
		if err != nil || !info.IsDir() {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_PATH", "message": "storage_root must be an existing directory"}})
			return
		}
		h.rc.StorageRoot = *req.StorageRoot
	}
	if req.MaxUploadSize != nil && *req.MaxUploadSize > 0 {
		h.rc.MaxUploadSize = *req.MaxUploadSize
	}
	if req.CORSOrigin != nil {
		h.rc.CORSOrigin = *req.CORSOrigin
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "config updated",
		"storage_root":    h.rc.StorageRoot,
		"max_upload_size": h.rc.MaxUploadSize,
		"cors_origin":     h.rc.CORSOrigin,
	})
}
