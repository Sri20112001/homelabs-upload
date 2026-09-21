package activity

// Curated, human-readable activity log ("who did what to which file, when").
// Postgres-backed (GORM) — indexed, filterable, no log-file parsing.
//
// The table is append-only and immutable: a DB trigger rejects UPDATE,
// DELETE, and TRUNCATE, and the API exposes no mutation endpoint. Every
// state-changing action (files, auth, users, config) must append here.

import (
	"strings"
	"time"

	"github.com/homelab/filemanager/internal/db"
	"gorm.io/gorm"
)

type Entry struct {
	ID     uint   `gorm:"primaryKey;autoIncrement" json:"-"`
	Time   string `json:"time"`
	User   string `json:"user"`
	Role   string `json:"role,omitempty"`
	Action string `gorm:"index:idx_activity_action" json:"action"`
	Path   string `json:"path,omitempty"`
	Detail string `json:"detail,omitempty"`
	IP     string `json:"ip,omitempty"`
	Status int    `json:"status,omitempty"`
}

func (Entry) TableName() string { return "activity" }

// File-oriented actions surfaced in the Activity UI.
const (
	ActionLogin          = "login"
	ActionLogout         = "logout"
	ActionSetup          = "setup"
	ActionUserCreate     = "user_create"
	ActionUpload         = "upload"
	ActionDownload       = "download"
	ActionMkdir          = "mkdir"
	ActionRename         = "rename"
	ActionMove           = "move"
	ActionCopy           = "copy"
	ActionDelete         = "delete"
	ActionTrashMove      = "trash_move"
	ActionTrashRestore   = "trash_restore"
	ActionTrashPurge     = "trash_purge"
	ActionZipDownload    = "zip_download"
	ActionBulkRename     = "bulk_rename"
	ActionPasswordChange = "password_change"
	ActionConfigChange   = "config_change"
)

type Store struct {
	database *gorm.DB
}

func NewStore(dsn string) (*Store, error) {
	database, err := db.Open(dsn, &Entry{})
	if err != nil {
		return nil, err
	}
	return &Store{database: database}, nil
}

func (s *Store) Log(e Entry) {
	if e.Time == "" {
		e.Time = time.Now().UTC().Format(time.RFC3339Nano)
	}
	_ = s.database.Create(&e).Error
}

type Query struct {
	Limit  int
	User   string
	Action string
	Search string
}

type Result struct {
	Items []Entry `json:"items"`
	Total int     `json:"total"`
}

// List returns newest-first entries matching q (SQL WHERE, paged by LIMIT).
func (s *Store) List(q Query) Result {
	limit := q.Limit
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	user := strings.ToLower(strings.TrimSpace(q.User))
	action := strings.ToLower(strings.TrimSpace(q.Action))
	search := strings.ToLower(strings.TrimSpace(q.Search))

	tx := s.database.Model(&Entry{})
	if user != "" {
		tx = tx.Where("LOWER(user) = ?", user)
	}
	if action != "" {
		tx = tx.Where("LOWER(action) = ?", action)
	}
	if search != "" {
		tx = tx.Where("LOWER(path || ' ' || detail || ' ' || user) LIKE ?", "%"+search+"%")
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return Result{Items: []Entry{}}
	}
	items := []Entry{}
	if err := tx.Order("id DESC").Limit(limit).Find(&items).Error; err != nil {
		return Result{Items: []Entry{}}
	}
	return Result{Items: items, Total: int(total)}
}

// NOTE: no Clear/Update/Delete API by design. activity is append-only:
// a DB trigger (see internal/db) rejects UPDATE/DELETE/TRUNCATE so entries
// can never be altered or removed once written.
