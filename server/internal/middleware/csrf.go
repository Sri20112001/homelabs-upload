package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

// CSRF guards cookie-authenticated mutations against cross-site requests.
//
// Bearer-header / query-token auth is immune (a custom header or secret query
// value can't be forged cross-site without a preflight), so only "cookie"
// sessions are checked. Safe methods never mutate and are skipped, as are
// /api/auth/* endpoints (login/setup must work before any session exists).
//
// The check is an Origin-vs-Host match (falling back to Referer), additionally
// accepting the configured frontend origin for split frontend/backend deploys.
// Requests with neither header (curl, scripts) are allowed through.
func CSRF(frontendOrigin string) gin.HandlerFunc {
	var allowedHost, allowedScheme string
	if u, err := url.Parse(frontendOrigin); err == nil {
		allowedHost, allowedScheme = u.Host, u.Scheme
	}
	return func(c *gin.Context) {
		m := c.Request.Method
		if m != "POST" && m != "PATCH" && m != "PUT" && m != "DELETE" {
			c.Next()
			return
		}
		if strings.HasPrefix(c.Request.URL.Path, "/api/auth/") {
			c.Next()
			return
		}
		if AuthVia(c) != "cookie" {
			c.Next()
			return
		}
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = c.GetHeader("Referer")
		}
		if origin == "" {
			c.Next() // non-browser client
			return
		}
		u, err := url.Parse(origin)
		if err != nil || u.Host == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "FORBIDDEN", "message": "Cross-site request blocked."},
			})
			return
		}
		if u.Host == c.Request.Host {
			c.Next()
			return
		}
		if allowedHost != "" && u.Host == allowedHost &&
			(allowedScheme == "" || u.Scheme == allowedScheme) {
			c.Next()
			return
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": gin.H{"code": "FORBIDDEN", "message": "Cross-site request blocked."},
		})
	}
}
