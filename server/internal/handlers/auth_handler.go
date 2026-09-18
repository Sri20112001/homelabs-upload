package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/activity"
	"github.com/homelab/filemanager/internal/auth"
	"github.com/homelab/filemanager/internal/middleware"
	"github.com/homelab/filemanager/internal/models"
)

type AuthHandler struct {
	users *auth.Store
	log   *activity.Store
}

func NewAuthHandler(users *auth.Store, log *activity.Store) *AuthHandler {
	return &AuthHandler{users: users, log: log}
}

// GET /api/auth/status → {setup_needed, user_count}
func (h *AuthHandler) Status(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"setup_needed": h.users.SetupNeeded(),
		"user_count":   h.users.Count(),
	})
}

// POST /api/auth/setup {username, display_name, password} — only when no users exist.
func (h *AuthHandler) Setup(c *gin.Context) {
	if !h.users.SetupNeeded() {
		c.JSON(http.StatusForbidden, gin.H{"error": models.NewError(models.ErrInvalidRequest, "setup already complete")})
		return
	}
	var req struct {
		Username    string `json:"username" binding:"required"`
		DisplayName string `json:"display_name"`
		Password    string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "username and password are required"))
		return
	}
	u, err := h.users.CreateUser(req.Username, req.DisplayName, req.Password, auth.RoleAdmin)
	if err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, err.Error()))
		return
	}
	sess, err := h.users.CreateSession(&auth.User{ID: u.ID}, c.ClientIP())
	if err != nil {
		respondError(c, models.NewError(models.ErrInternal, "cannot create session"))
		return
	}
	h.log.Log(activity.Entry{User: u.Username, Role: u.Role, Action: activity.ActionSetup, Detail: "first admin created", IP: c.ClientIP(), Status: 201})
	middleware.SetSessionCookie(c, sess.Token)
	c.JSON(http.StatusCreated, gin.H{"token": sess.Token, "user": u})
}

// POST /api/auth/login {username, password}
func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, models.NewError(models.ErrInvalidRequest, "username and password are required"))
		return
	}
	u, err := h.users.Verify(req.Username, req.Password)
	if err != nil {
		h.log.Log(activity.Entry{User: strings.ToLower(strings.TrimSpace(req.Username)), Action: activity.ActionLogin, Detail: "failed login", IP: c.ClientIP(), Status: 401})
		c.JSON(http.StatusUnauthorized, gin.H{"error": models.NewError("UNAUTHORIZED", "Invalid username or password.")})
		return
	}
	sess, err := h.users.CreateSession(&auth.User{ID: u.ID}, c.ClientIP())
	if err != nil {
		respondError(c, models.NewError(models.ErrInternal, "cannot create session"))
		return
	}
	h.log.Log(activity.Entry{User: u.Username, Role: u.Role, Action: activity.ActionLogin, IP: c.ClientIP(), Status: 200})
	middleware.SetSessionCookie(c, sess.Token)
	c.JSON(http.StatusOK, gin.H{"token": sess.Token, "user": u})
}

// POST /api/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	token := middleware.TokenFromRequest(c)
	_, username, _, _ := middleware.CurrentUser(c)
	h.users.Revoke(token)
	middleware.ClearSessionCookie(c)
	h.log.Log(activity.Entry{User: username, Action: activity.ActionLogout, IP: c.ClientIP(), Status: 200})
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

// GET /api/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	id, username, displayName, role := middleware.CurrentUser(c)
	c.JSON(http.StatusOK, gin.H{"user": gin.H{
		"id": id, "username": username, "display_name": displayName, "role": role,
	}})
}
