package middleware

import (
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

// Counters — all updated atomically, no external dependency needed.
var (
	metricRequestsTotal   atomic.Int64
	metricRequestErrors   atomic.Int64
	metricUploadBytesTotal atomic.Int64
	metricUploadCount     atomic.Int64
	metricLatencyMsTotal  atomic.Int64 // sum of all request latencies in ms
)

// Metrics middleware increments counters on every request.
func Metrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		metricRequestsTotal.Add(1)
		metricLatencyMsTotal.Add(time.Since(start).Milliseconds())

		if c.Writer.Status() >= 400 {
			metricRequestErrors.Add(1)
		}
		// Track upload bytes from Content-Length on upload endpoints
		if c.Request.Method == http.MethodPost &&
			(c.FullPath() == "/api/files/upload" || c.FullPath() == "/api/files/chunk") {
			if c.Writer.Status() < 300 {
				metricUploadBytesTotal.Add(c.Request.ContentLength)
				metricUploadCount.Add(1)
			}
		}
	}
}

// AddUploadBytes lets the handler report exact bytes written (for chunked uploads).
func AddUploadBytes(n int64) { metricUploadBytesTotal.Add(n) }

// MetricsHandler serves a Prometheus text-format /metrics response.
func MetricsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqs := metricRequestsTotal.Load()
		errs := metricRequestErrors.Load()
		uploadBytes := metricUploadBytesTotal.Load()
		uploads := metricUploadCount.Load()
		latency := metricLatencyMsTotal.Load()

		var avgLatency float64
		if reqs > 0 {
			avgLatency = float64(latency) / float64(reqs)
		}

		body := fmt.Sprintf(`# HELP filemanager_requests_total Total HTTP requests handled
# TYPE filemanager_requests_total counter
filemanager_requests_total %d

# HELP filemanager_request_errors_total Total HTTP requests with status >= 400
# TYPE filemanager_request_errors_total counter
filemanager_request_errors_total %d

# HELP filemanager_upload_bytes_total Total bytes uploaded
# TYPE filemanager_upload_bytes_total counter
filemanager_upload_bytes_total %d

# HELP filemanager_uploads_total Total successful file uploads
# TYPE filemanager_uploads_total counter
filemanager_uploads_total %d

# HELP filemanager_request_latency_avg_ms Average request latency in milliseconds
# TYPE filemanager_request_latency_avg_ms gauge
filemanager_request_latency_avg_ms %.2f
`, reqs, errs, uploadBytes, uploads, avgLatency)

		c.Data(http.StatusOK, "text/plain; version=0.0.4; charset=utf-8", []byte(body))
	}
}
