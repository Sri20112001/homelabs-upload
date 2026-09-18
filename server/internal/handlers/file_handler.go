package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/activity"
	"github.com/homelab/filemanager/internal/middleware"
	"github.com/homelab/filemanager/internal/models"
	"github.com/homelab/filemanager/internal/services"
)

// FileHandler handles all HTTP concerns for file operations.
type FileHandler struct {
	svc *services.FileService
	log *activity.Store
}

func NewFileHandler(svc *services.FileService, log *activity.Store) *FileHandler {
	return &FileHandler{svc: svc, log: log}
}

func (h *FileHandler) actor(c *gin.Context) (username, role string) {
	_, username, _, role = middleware.CurrentUser(c)
	if username == "" {
		username = "unknown"
	}
	return username, role
}

func (h *FileHandler) record(c *gin.Context, action, path, detail string, status int) {
	if h.log == nil {
		return
	}
	user, role := h.actor(c)
	h.log.Log(activity.Entry{
		User: user, Role: role, Action: action,
		Path: path, Detail: detail, IP: c.ClientIP(), Status: status,
	})
}

// ListDirectory  GET /api/files?path=
func (h *FileHandler) ListDirectory(c *gin.Context) {
	path := c.DefaultQuery("path", "/")
	resp, err := h.svc.ListDirectory(path)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// GetMetadata  GET /api/files/metadata?path=
func (h *FileHandler) GetMetadata(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		respondError(c, models.NewError(models.ErrInvalidRequest, "path is required"))
		return
	}
	item, err := h.svc.GetMetadata(path)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

// Download  GET /api/files/download?path=
func (h *FileHandler) Download(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		respondError(c, models.NewError(models.ErrInvalidRequest, "path is required"))
		return
	}
	f, info, err := h.svc.OpenForDownload(path)
	if err != nil {
		respondError(c, err)
		return
	}
	defer f.Close()

	mimeType := detectMIMEFromName(info.Name())
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, info.Name()))
	c.Header("Content-Length", strconv.FormatInt(info.Size(), 10))
	h.record(c, activity.ActionDownload, path, "", http.StatusOK)
	c.DataFromReader(http.StatusOK, info.Size(), mimeType, f, nil)
}

// Upload  POST /api/files/upload?path=
func (h *FileHandler) Upload(c *gin.Context) {
	destDir := c.DefaultQuery("path", "/")

	fh, err := c.FormFile("file")
	if err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "file field is required"))
		return
	}

	src, err := fh.Open()
	if err != nil {
		respondError(c, models.NewError(models.ErrInternal, "cannot open uploaded file"))
		return
	}
	defer src.Close()

	clientPath, svcErr := h.svc.SaveUpload(c.Request.Context(), destDir, filepath.Base(fh.Filename), src, fh.Size)
	if svcErr != nil {
		respondError(c, svcErr)
		return
	}
	h.record(c, activity.ActionUpload, clientPath, fmt.Sprintf("%s (%d bytes) → %s", fh.Filename, fh.Size, destDir), http.StatusCreated)
	c.JSON(http.StatusCreated, gin.H{"message": "file uploaded successfully", "path": clientPath})
}

// CreateDirectory  POST /api/directories
func (h *FileHandler) CreateDirectory(c *gin.Context) {
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "path is required"))
		return
	}
	if err := h.svc.CreateDirectory(req.Path); err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionMkdir, req.Path, "", http.StatusCreated)
	c.JSON(http.StatusCreated, gin.H{"message": "directory created", "path": req.Path})
}

// Rename  PATCH /api/files
func (h *FileHandler) Rename(c *gin.Context) {
	var req struct {
		Path    string `json:"path"     binding:"required"`
		NewName string `json:"new_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "path and new_name are required"))
		return
	}
	if err := h.svc.Rename(req.Path, req.NewName); err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionRename, req.Path, "→ "+req.NewName, http.StatusOK)
	c.JSON(http.StatusOK, gin.H{"message": "renamed successfully"})
}

// Move  POST /api/files/move
func (h *FileHandler) Move(c *gin.Context) {
	var req struct {
		Source      string `json:"source"      binding:"required"`
		Destination string `json:"destination" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "source and destination are required"))
		return
	}
	if err := h.svc.Move(req.Source, req.Destination); err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionMove, req.Source, "→ "+req.Destination, http.StatusOK)
	c.JSON(http.StatusOK, gin.H{"message": "moved successfully"})
}

// Copy  POST /api/files/copy
func (h *FileHandler) Copy(c *gin.Context) {
	var req struct {
		Source      string `json:"source"      binding:"required"`
		Destination string `json:"destination" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "source and destination are required"))
		return
	}
	if err := h.svc.Copy(c.Request.Context(), req.Source, req.Destination); err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionCopy, req.Source, "→ "+req.Destination, http.StatusOK)
	c.JSON(http.StatusOK, gin.H{"message": "copied successfully"})
}

// Delete  DELETE /api/files
func (h *FileHandler) Delete(c *gin.Context) {
	var req struct {
		Path      string `json:"path"      binding:"required"`
		Recursive bool   `json:"recursive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "path is required"))
		return
	}
	if err := h.svc.Delete(req.Path, req.Recursive); err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionDelete, req.Path, "", http.StatusOK)
	c.JSON(http.StatusOK, gin.H{"message": "deleted successfully"})
}

// Search  GET /api/search?q=&path=
func (h *FileHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		respondError(c, models.NewError(models.ErrInvalidRequest, "q is required"))
		return
	}
	basePath := c.DefaultQuery("path", "/")
	results, err := h.svc.Search(query, basePath)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"query": query, "results": results})
}

// StorageInfo  GET /api/storage
func (h *FileHandler) StorageInfo(c *gin.Context) {
	info, err := h.svc.StorageInfo()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, info)
}

// ZipDownload  POST /api/files/zip
func (h *FileHandler) ZipDownload(c *gin.Context) {
	var req struct {
		Paths []string `json:"paths" binding:"required"`
		Name  string   `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Paths) == 0 {
		respondError(c, models.NewError(models.ErrInvalidRequest, "paths array is required"))
		return
	}
	name := req.Name
	if name == "" {
		name = "download.zip"
	}
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, name))
	c.Header("Content-Type", "application/zip")
	c.Header("Transfer-Encoding", "chunked")
	c.Status(http.StatusOK)
	h.record(c, activity.ActionZipDownload, "", fmt.Sprintf("%d items → %s", len(req.Paths), name), http.StatusOK)
	if err := h.svc.ZipStream(c.Request.Context(), req.Paths, c.Writer); err != nil {
		// Headers already sent; nothing we can do
		_ = err
	}
}

// FolderSize  GET /api/files/size?path=
func (h *FileHandler) FolderSize(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		respondError(c, models.NewError(models.ErrInvalidRequest, "path is required"))
		return
	}
	result, err := h.svc.FolderSize(path)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// UploadChunk  POST /api/files/chunk?upload_id=&index=
func (h *FileHandler) UploadChunk(c *gin.Context) {
	uploadID := c.Query("upload_id")
	indexStr := c.Query("index")
	if uploadID == "" || indexStr == "" {
		respondError(c, models.NewError(models.ErrInvalidRequest, "upload_id and index are required"))
		return
	}
	index, err := strconv.Atoi(indexStr)
	if err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "index must be an integer"))
		return
	}
	if err := h.svc.SaveChunk(uploadID, index, c.Request.Body); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "chunk received"})
}

// FinalizeChunk  POST /api/files/chunk/finalize
func (h *FileHandler) FinalizeChunk(c *gin.Context) {
	var req struct {
		UploadID string `json:"upload_id" binding:"required"`
		DestDir  string `json:"dest_dir"  binding:"required"`
		Filename string `json:"filename"  binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "upload_id, dest_dir, filename required"))
		return
	}
	path, err := h.svc.FinalizeChunk(c.Request.Context(), req.UploadID, req.DestDir, req.Filename)
	if err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionUpload, path, fmt.Sprintf("%s (chunked) → %s", req.Filename, req.DestDir), http.StatusCreated)
	c.JSON(http.StatusCreated, gin.H{"message": "file assembled", "path": path})
}

// TrashMove  POST /api/trash
func (h *FileHandler) TrashMove(c *gin.Context) {
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "path is required"))
		return
	}
	if err := h.svc.TrashMove(req.Path); err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionTrashMove, req.Path, "", http.StatusOK)
	c.JSON(http.StatusOK, gin.H{"message": "moved to trash"})
}

// TrashList  GET /api/trash
func (h *FileHandler) TrashList(c *gin.Context) {
	items, err := h.svc.TrashList()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// TrashRestore  POST /api/trash/restore
func (h *FileHandler) TrashRestore(c *gin.Context) {
	var req struct {
		ID string `json:"id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "id is required"))
		return
	}
	if err := h.svc.TrashRestore(req.ID); err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionTrashRestore, req.ID, "", http.StatusOK)
	c.JSON(http.StatusOK, gin.H{"message": "restored"})
}

// TrashPurge  DELETE /api/trash
func (h *FileHandler) TrashPurge(c *gin.Context) {
	if err := h.svc.TrashPurge(); err != nil {
		respondError(c, err)
		return
	}
	h.record(c, activity.ActionTrashPurge, "", "trash purged", http.StatusOK)
	c.JSON(http.StatusOK, gin.H{"message": "trash purged"})
}

// WatchDirectory  GET /api/watch?path= (SSE)
func (h *FileHandler) WatchDirectory(c *gin.Context) {
	path := c.DefaultQuery("path", "/")
	abs, err := h.svc.ResolvePath(path)
	if err != nil {
		respondError(c, err)
		return
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		respondError(c, models.NewError(models.ErrInternal, "cannot create watcher"))
		return
	}
	defer watcher.Close()

	if err := watcher.Add(abs); err != nil {
		respondError(c, models.NewError(models.ErrInternal, "cannot watch directory"))
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	// Debounce: send at most one event per 300ms
	ticker := time.NewTicker(300 * time.Millisecond)
	defer ticker.Stop()
	pending := false

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case _, ok := <-watcher.Events:
			if !ok {
				return
			}
			pending = true
		case <-ticker.C:
			if pending {
				_, _ = c.Writer.WriteString("data: changed\n\n")
				c.Writer.Flush()
				pending = false
			}
		}
	}
}

// BulkRename  POST /api/files/bulk-rename
func (h *FileHandler) BulkRename(c *gin.Context) {
	var req struct {
		Renames []struct {
			Path    string `json:"path"`
			NewName string `json:"new_name"`
		} `json:"renames" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Renames) == 0 {
		respondError(c, models.NewError(models.ErrInvalidRequest, "renames array is required"))
		return
	}
	var errs []string
	for _, r := range req.Renames {
		if err := h.svc.Rename(r.Path, r.NewName); err != nil {
			errs = append(errs, r.Path+": "+err.Error())
		}
	}
	if len(errs) > 0 {
		c.JSON(http.StatusMultiStatus, gin.H{"errors": errs})
		return
	}
	h.record(c, activity.ActionBulkRename, "", fmt.Sprintf("%d items renamed", len(req.Renames)), http.StatusOK)
	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d items renamed", len(req.Renames))})
}

// --- helpers ---

func respondError(c *gin.Context, err error) {
	var appErr *models.AppError
	if errors.As(err, &appErr) {
		c.JSON(httpStatus(appErr.Code), gin.H{"error": appErr})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": models.NewError(models.ErrInternal, "internal server error")})
}

func httpStatus(code models.ErrorCode) int {
	switch code {
	case models.ErrInvalidPath, models.ErrInvalidRequest, models.ErrInvalidFileName:
		return http.StatusBadRequest
	case models.ErrPathTraversal:
		return http.StatusForbidden
	case models.ErrFileNotFound, models.ErrDirNotFound:
		return http.StatusNotFound
	case models.ErrFileExists, models.ErrDirExists:
		return http.StatusConflict
	case models.ErrPermissionDenied:
		return http.StatusForbidden
	case models.ErrFileTooLarge:
		return http.StatusRequestEntityTooLarge
	default:
		return http.StatusInternalServerError
	}
}

func detectMIMEFromName(name string) string {
	ext := filepath.Ext(name)
	if t := mimeByExt(ext); t != "" {
		return t
	}
	return "application/octet-stream"
}

func mimeByExt(ext string) string {
	m := map[string]string{
		".pdf":  "application/pdf",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".mp4":  "video/mp4",
		".txt":  "text/plain",
		".html": "text/html",
		".json": "application/json",
		".zip":  "application/zip",
	}
	return m[ext]
}
