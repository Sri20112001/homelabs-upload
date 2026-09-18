package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/activity"
	"github.com/homelab/filemanager/internal/auth"
	"github.com/homelab/filemanager/internal/middleware"
	"github.com/homelab/filemanager/internal/models"
)

type UsersHandler struct {
	users *auth.Store
	log   *activity.Store
}

func NewUsersHandler(users *auth.Store, log *activity.Store) *UsersHandler {
	return &UsersHandler{users: users, log: log}
}

// GET /api/users (admin)
func (h *UsersHandler) List(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"items": h.users.ListUsers()})
}

// POST /api/users {username, display_name, password, role}
// Any logged-in user may create accounts (there is no open registration);
// only admins may grant the admin role — members always create members.
func (h *UsersHandler) Create(c *gin.Context) {
	var req struct {
		Username    string `json:"username" binding:"required"`
		DisplayName string `json:"display_name"`
		Password    string `json:"password" binding:"required"`
		Role        string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "username and password are required"))
		return
	}
	if !middleware.IsAdmin(c) {
		req.Role = auth.RoleMember
	}
	u, err := h.users.CreateUser(req.Username, req.DisplayName, req.Password, req.Role)
	if err != nil {
		if err == auth.ErrExists {
			c.JSON(http.StatusConflict, gin.H{"error": models.NewError(models.ErrFileExists, "username already taken")})
			return
		}
		respondError(c, models.NewError(models.ErrInvalidRequest, err.Error()))
		return
	}
	_, actor, _, _ := middleware.CurrentUser(c)
	h.log.Log(activity.Entry{User: actor, Action: activity.ActionUserCreate, Detail: "created " + u.Username + " (" + u.Role + ")", IP: c.ClientIP(), Status: 201})
	c.JSON(http.StatusCreated, gin.H{"user": u})
}

// PATCH /api/users/:id {display_name, role, password} (admin)
func (h *UsersHandler) Update(c *gin.Context) {
	var req struct {
		DisplayName string `json:"display_name"`
		Role        string `json:"role"`
		Password    string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "invalid request"))
		return
	}
	u, err := h.users.UpdateUser(c.Param("id"), req.DisplayName, req.Role, req.Password)
	if err != nil {
		if err == auth.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": models.NewError(models.ErrFileNotFound, "user not found")})
			return
		}
		respondError(c, models.NewError(models.ErrInvalidRequest, err.Error()))
		return
	}
	_, actor, _, _ := middleware.CurrentUser(c)
	detail := "updated " + u.Username
	if req.Password != "" {
		detail += " (password reset)"
		h.log.Log(activity.Entry{User: actor, Action: activity.ActionPasswordChange, Detail: detail, IP: c.ClientIP(), Status: 200})
	} else {
		h.log.Log(activity.Entry{User: actor, Action: activity.ActionUserCreate, Detail: detail, IP: c.ClientIP(), Status: 200})
	}
	c.JSON(http.StatusOK, gin.H{"user": u})
}

// DELETE /api/users/:id (admin)
func (h *UsersHandler) Delete(c *gin.Context) {
	_, self, _, _ := middleware.CurrentUser(c)
	// resolve self ID for the self-delete guard
	var selfID string
	for _, u := range h.users.ListUsers() {
		if u.Username == self {
			selfID = u.ID
			break
		}
	}
	if err := h.users.DeleteUser(c.Param("id"), selfID); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, err.Error()))
		return
	}
	h.log.Log(activity.Entry{User: self, Action: activity.ActionUserCreate, Detail: "removed user " + c.Param("id"), IP: c.ClientIP(), Status: 200})
	c.JSON(http.StatusOK, gin.H{"message": "user removed"})
}
