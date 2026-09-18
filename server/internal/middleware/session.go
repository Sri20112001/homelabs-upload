package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/homelab/filemanager/internal/auth"
)

// SessionCookie is the HttpOnly cookie carrying the session token.
// Cookies (not localStorage) so tokens are invisible to page JS, and
// downloads / EventSource authenticate automatically.
const SessionCookie = "nv_session"

// sessionCookieAge mirrors the session TTL in auth (30 days).
const sessionCookieAge = 30 * 24 * 3600

// SessionAuth authenticates via session tokens issued at login.
// Token sources (first hit wins): nv_session cookie, Authorization header,
// ?token= query (scripts / old clients).
// Falls back to the legacy static API_KEY when configured.
type SessionAuth struct {
	store  *auth.Store
	apiKey string
}

func NewSessionAuth(store *auth.Store, apiKey string) *SessionAuth {
	return &SessionAuth{store: store, apiKey: apiKey}
}

// TokenFromRequest extracts the session token: cookie → header → query.
func TokenFromRequest(c *gin.Context) string {
	if t, err := c.Cookie(SessionCookie); err == nil && strings.TrimSpace(t) != "" {
		return strings.TrimSpace(t)
	}
	if h := c.GetHeader("Authorization"); h != "" {
		if t := strings.TrimPrefix(h, "Bearer "); t != h && t != "" {
			return strings.TrimSpace(t)
		}
	}
	if t := c.Query("token"); t != "" {
		return strings.TrimSpace(t)
	}
	return ""
}

// AuthVia reports how the request authenticated: cookie, header, query, legacy or "".
func AuthVia(c *gin.Context) string {
	if v, ok := c.Get("authVia"); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func (s *SessionAuth) Authenticate(c *gin.Context) error {
	// Setup mode: no users yet → only /api/auth/* is reachable (wired in router).
	if t, err := c.Cookie(SessionCookie); err == nil && strings.TrimSpace(t) != "" {
		if user, sess := s.store.Lookup(strings.TrimSpace(t)); user != nil {
			s.setIdentity(c, user.ID, user.Username, user.DisplayName, user.Role, sess, "cookie")
			return nil
		}
	}
	if h := c.GetHeader("Authorization"); h != "" {
		if t := strings.TrimPrefix(h, "Bearer "); t != h && strings.TrimSpace(t) != "" {
			token := strings.TrimSpace(t)
			if user, sess := s.store.Lookup(token); user != nil {
				s.setIdentity(c, user.ID, user.Username, user.DisplayName, user.Role, sess, "header")
				return nil
			}
			// Legacy single-key fallback (homelab scripts / old clients).
			if s.apiKey != "" &&
				subtle.ConstantTimeCompare([]byte(token), []byte(s.apiKey)) == 1 {
				s.setIdentity(c, "legacy-key", "api-key", "API key", auth.RoleAdmin, nil, "legacy")
				return nil
			}
		}
	}
	if t := strings.TrimSpace(c.Query("token")); t != "" {
		if user, sess := s.store.Lookup(t); user != nil {
			s.setIdentity(c, user.ID, user.Username, user.DisplayName, user.Role, sess, "query")
			return nil
		}
		if s.apiKey != "" &&
			subtle.ConstantTimeCompare([]byte(t), []byte(s.apiKey)) == 1 {
			s.setIdentity(c, "legacy-key", "api-key", "API key", auth.RoleAdmin, nil, "legacy")
			return nil
		}
	}
	return &authError{}
}

func (s *SessionAuth) setIdentity(c *gin.Context, id, username, displayName, role string, sess any, via string) {
	c.Set("userID", id)
	c.Set("username", username)
	c.Set("displayName", displayName)
	c.Set("role", role)
	if sess != nil {
		c.Set("session", sess)
	}
	c.Set("authVia", via)
}

// SetSessionCookie writes the login cookie. Secure is auto-detected
// (TLS or X-Forwarded-Proto=https) so plain-LAN http keeps working.
func SetSessionCookie(c *gin.Context, token string) {
	secure := c.Request.TLS != nil ||
		strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(SessionCookie, token, sessionCookieAge, "/", "", secure, true)
}

// ClearSessionCookie removes the login cookie (same attributes as set).
func ClearSessionCookie(c *gin.Context) {
	secure := c.Request.TLS != nil ||
		strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(SessionCookie, "", -1, "/", "", secure, true)
}

// CurrentUser reads the authenticated identity back out.
func CurrentUser(c *gin.Context) (id, username, displayName, role string) {
	if v, ok := c.Get("userID"); ok {
		if s, ok := v.(string); ok {
			id = s
		}
	}
	if v, ok := c.Get("username"); ok {
		if s, ok := v.(string); ok {
			username = s
		}
	}
	if v, ok := c.Get("displayName"); ok {
		if s, ok := v.(string); ok {
			displayName = s
		}
	}
	if v, ok := c.Get("role"); ok {
		if s, ok := v.(string); ok {
			role = s
		}
	}
	return id, username, displayName, role
}

func IsAdmin(c *gin.Context) bool {
	_, _, _, role := CurrentUser(c)
	return role == auth.RoleAdmin
}

// RequireAdmin blocks non-admin members (user/config management).
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !IsAdmin(c) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "FORBIDDEN", "message": "Admin only."},
			})
			return
		}
		c.Next()
	}
}
