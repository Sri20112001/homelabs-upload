package middleware

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// ipLimiter holds a per-IP token bucket.
type ipLimiter struct {
	limiter *rate.Limiter
}

type rateLimiterStore struct {
	mu       sync.Mutex
	limiters map[string]*ipLimiter
	r        rate.Limit
	b        int
}

func newStore(r rate.Limit, b int) *rateLimiterStore {
	return &rateLimiterStore{limiters: make(map[string]*ipLimiter), r: r, b: b}
}

func (s *rateLimiterStore) get(ip string) *rate.Limiter {
	s.mu.Lock()
	defer s.mu.Unlock()
	if l, ok := s.limiters[ip]; ok {
		return l.limiter
	}
	l := &ipLimiter{limiter: rate.NewLimiter(s.r, s.b)}
	s.limiters[ip] = l
	return l.limiter
}

// RateLimit returns a middleware that allows r requests/second with burst b per IP.
func RateLimit(r rate.Limit, b int) gin.HandlerFunc {
	store := newStore(r, b)
	return func(c *gin.Context) {
		if !store.get(c.ClientIP()).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{"code": "RATE_LIMITED", "message": "Too many requests."},
			})
			return
		}
		c.Next()
	}
}
