package applog

// Structured application logs in Postgres (table: app_logs).
//
// Every HTTP request writes one record (method, path, status, duration,
// user, IP, request id); panics and 5xx responses are stored as level=error.
// This is the feed a future log-aggregator (Loki/ELK/Grafana) tails — one
// place for request logs plus the curated activity log.
//
// Writes go through Writer: a buffered, non-blocking channel with batched
// inserts, so a slow database can never slow down or block requests.
// Time stays RFC3339Nano TEXT on both backends, like the activity log.

import (
	"strings"
	"sync"
	"time"

	"github.com/homelab/filemanager/internal/db"
	"gorm.io/gorm"
)

const (
	LevelDebug = "debug"
	LevelInfo  = "info"
	LevelWarn  = "warn"
	LevelError = "error"
)

// Record is one structured log line.
type Record struct {
	ID         uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Time       string `json:"time"`
	Level      string `gorm:"index:idx_app_logs_level" json:"level"`
	Service    string `json:"service"`
	Message    string `json:"message"`
	RequestID  string `gorm:"index:idx_app_logs_request" json:"request_id"`
	Method     string `json:"method"`
	Path       string `gorm:"index:idx_app_logs_path" json:"path"`
	Status     int    `json:"status"`
	DurationMs int64  `json:"duration_ms"`
	Username   string `json:"username"`
	IP         string `json:"ip"`
	// Fields carries extra structured context as a JSON object string.
	// Kept as TEXT for backend parity; promote to JSONB on Postgres later
	// if the aggregator wants server-side JSON queries.
	Fields string `json:"fields,omitempty"`
}

func (Record) TableName() string { return "app_logs" }

type Store struct {
	database *gorm.DB
}

func NewStore(dsn string) (*Store, error) {
	database, err := db.Open(dsn, &Record{})
	if err != nil {
		return nil, err
	}
	return &Store{database: database}, nil
}

// insertBatch writes a batch in one round trip (called by Writer only).
func (s *Store) insertBatch(batch []Record) error {
	return s.database.CreateInBatches(batch, 200).Error
}

type Query struct {
	Limit     int
	Level     string
	Search    string
	RequestID string
	// Since is RFC3339; empty means no lower bound. TEXT timestamps sort
	// lexicographically, so string comparison is correct for UTC RFC3339.
	Since string
}

type Result struct {
	Items []Record `json:"items"`
	Total int      `json:"total"`
}

// List returns newest-first records matching q (paged by LIMIT).
func (s *Store) List(q Query) Result {
	limit := q.Limit
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	level := strings.ToLower(strings.TrimSpace(q.Level))
	search := strings.ToLower(strings.TrimSpace(q.Search))
	requestID := strings.TrimSpace(q.RequestID)
	since := strings.TrimSpace(q.Since)

	tx := s.database.Model(&Record{})
	if level != "" {
		tx = tx.Where("level = ?", level)
	}
	if requestID != "" {
		tx = tx.Where("request_id = ?", requestID)
	}
	if since != "" {
		tx = tx.Where("time >= ?", since)
	}
	if search != "" {
		tx = tx.Where("LOWER(message || ' ' || path || ' ' || username) LIKE ?", "%"+search+"%")
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return Result{Items: []Record{}}
	}
	items := []Record{}
	if err := tx.Order("id DESC").Limit(limit).Find(&items).Error; err != nil {
		return Result{Items: []Record{}}
	}
	return Result{Items: items, Total: int(total)}
}

func (s *Store) Clear() error {
	return s.database.Where("1 = 1").Delete(&Record{}).Error
}

// ---- async writer ----

const (
	writeBuffer  = 1000
	flushEvery   = time.Second
	flushBatchAt = 200
)

// Writer buffers records in memory and flushes them in batches on a
// background goroutine. Log() never blocks the caller: when the buffer is
// full the record is dropped (and counted) instead of stalling a request.
type Writer struct {
	store   *Store
	ch      chan Record
	done    chan struct{}
	wg      sync.WaitGroup
	mu      sync.Mutex
	dropped int64
}

func NewWriter(store *Store) *Writer {
	w := &Writer{store: store, ch: make(chan Record, writeBuffer), done: make(chan struct{})}
	w.wg.Add(1)
	go w.loop()
	return w
}

// Log queues a record; safe to call with a nil *Writer (no-op).
func (w *Writer) Log(r Record) {
	if w == nil {
		return
	}
	if r.Time == "" {
		r.Time = time.Now().UTC().Format(time.RFC3339Nano)
	}
	select {
	case w.ch <- r:
	default:
		w.mu.Lock()
		w.dropped++
		w.mu.Unlock()
	}
}

// Dropped reports how many records were shed under backpressure.
func (w *Writer) Dropped() int64 {
	if w == nil {
		return 0
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.dropped
}

// Close flushes pending records. Called on shutdown; tests may skip it.
func (w *Writer) Close() {
	if w == nil {
		return
	}
	close(w.done)
	w.wg.Wait()
}

func (w *Writer) loop() {
	defer w.wg.Done()
	ticker := time.NewTicker(flushEvery)
	defer ticker.Stop()
	var batch []Record
	flush := func() {
		if len(batch) == 0 {
			return
		}
		_ = w.store.insertBatch(batch)
		batch = batch[:0]
	}
	for {
		select {
		case r := <-w.ch:
			batch = append(batch, r)
			if len(batch) >= flushBatchAt {
				flush()
			}
		case <-ticker.C:
			flush()
		case <-w.done:
			// Drain the channel before exiting so shutdown loses nothing.
			for {
				select {
				case r := <-w.ch:
					batch = append(batch, r)
					if len(batch) >= flushBatchAt {
						flush()
					}
				default:
					flush()
					return
				}
			}
		}
	}
}

// LevelForStatus maps an HTTP status to a log level.
func LevelForStatus(status int) string {
	switch {
	case status >= 500:
		return LevelError
	case status >= 400:
		return LevelWarn
	default:
		return LevelInfo
	}
}
