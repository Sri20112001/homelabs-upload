package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Authenticator is the interface for pluggable auth strategies.
type Authenticator interface {
	Authenticate(c *gin.Context) error
}

// APIKeyAuth implements Authenticator using a static bearer token.
// If apiKey is empty, all requests are allowed (dev mode).
type APIKeyAuth struct {
	apiKey string
}

func NewAPIKeyAuth(apiKey string) *APIKeyAuth {
	return &APIKeyAuth{apiKey: apiKey}
}

func (a *APIKeyAuth) Authenticate(c *gin.Context) error {
	if a.apiKey == "" {
		return nil // auth disabled
	}
	header := c.GetHeader("Authorization")
	token := strings.TrimPrefix(header, "Bearer ")
	if subtle.ConstantTimeCompare([]byte(token), []byte(a.apiKey)) != 1 {
		return &authError{}
	}
	return nil
}

type authError struct{}

func (e *authError) Error() string { return "unauthorized" }

// Auth returns a Gin middleware that delegates to the given Authenticator.
func Auth(a Authenticator) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := a.Authenticate(c); err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "Authentication required."},
			})
			return
		}
		c.Next()
	}
}
