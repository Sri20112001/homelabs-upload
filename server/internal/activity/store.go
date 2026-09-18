package activity

// Curated, human-readable activity log ("who did what to which file, when").
// Backed by the embedded SQLite node database (table: activity) — indexed,
// filterable, no log-file parsing. Pre-SQLite activity.jsonl is imported once.

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/homelab/filemanager/internal/db"
)

type Entry struct {
	Time   time.Time `json:"time"`
	User   string    `json:"user"`
	Role   string    `json:"role,omitempty"`
	Action string    `json:"action"`
	Path   string    `json:"path,omitempty"`
	Detail string    `json:"detail,omitempty"`
	IP     string    `json:"ip,omitempty"`
	Status int       `json:"status,omitempty"`
}

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
)

type Store struct {
	database *sql.DB
	dir      string
}

func NewStore(storageRoot string) (*Store, error) {
	dir, err := db.DirForStorage(storageRoot)
	if err != nil {
		return nil, err
	}
	database, err := db.Open(dir)
	if err != nil {
		return nil, err
	}
	s := &Store{database: database, dir: dir}
	if err := s.importLegacyJSONL(); err != nil {
		_ = database.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Path() string { return filepath.Join(s.dir, "nodevault.db") }

func (s *Store) Log(e Entry) {
	if e.Time.IsZero() {
		e.Time = time.Now().UTC()
	}
	_, _ = s.database.Exec(
		`INSERT INTO activity(time,user,role,action,path,detail,ip,status) VALUES(?,?,?,?,?,?,?,?)`,
		e.Time.UTC().Format(time.RFC3339Nano), e.User, e.Role, e.Action,
		e.Path, e.Detail, e.IP, e.Status,
	)
}

// importLegacyJSONL migrates activity.jsonl once (pre-SQLite installs).
func (s *Store) importLegacyJSONL() error {
	var n int
	if err := s.database.QueryRow(`SELECT COUNT(*) FROM activity`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	f, err := os.Open(filepath.Join(s.dir, "activity.jsonl"))
	if err != nil {
		return nil // no legacy file: fresh node
	}
	defer f.Close()
	tx, err := s.database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	stmt, err := tx.Prepare(
		`INSERT INTO activity(time,user,role,action,path,detail,ip,status) VALUES(?,?,?,?,?,?,?,?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 256*1024), 256*1024)
	for sc.Scan() {
		var e Entry
		if err := json.Unmarshal([]byte(sc.Text()), &e); err != nil {
			continue
		}
		t := e.Time.UTC()
		if t.IsZero() {
			t = time.Now().UTC()
		}
		_, _ = stmt.Exec(t.Format(time.RFC3339Nano), e.User, e.Role, e.Action,
			e.Path, e.Detail, e.IP, e.Status)
	}
	return tx.Commit()
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

	var conds []string
	var args []any
	if user != "" {
		conds = append(conds, `LOWER(user)=?`)
		args = append(args, user)
	}
	if action != "" {
		conds = append(conds, `LOWER(action)=?`)
		args = append(args, action)
	}
	if search != "" {
		conds = append(conds, `LOWER(path || ' ' || detail || ' ' || user) LIKE ?`)
		args = append(args, "%"+search+"%")
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	var total int
	if err := s.database.QueryRow(`SELECT COUNT(*) FROM activity `+where, args...).Scan(&total); err != nil {
		return Result{Items: []Entry{}}
	}
	rows, err := s.database.Query(
		`SELECT time,user,role,action,path,detail,ip,status FROM activity `+where+` ORDER BY id DESC LIMIT ?`,
		append(args, limit)...,
	)
	if err != nil {
		return Result{Items: []Entry{}}
	}
	defer rows.Close()
	items := []Entry{}
	for rows.Next() {
		var e Entry
		var t string
		if err := rows.Scan(&t, &e.User, &e.Role, &e.Action, &e.Path, &e.Detail, &e.IP, &e.Status); err != nil {
			continue
		}
		if parsed, err := time.Parse(time.RFC3339Nano, t); err == nil {
			e.Time = parsed
		} else if parsed, err := time.Parse(time.RFC3339, t); err == nil {
			e.Time = parsed
		}
		items = append(items, e)
	}
	return Result{Items: items, Total: total}
}

func (s *Store) Clear() error {
	_, err := s.database.Exec(`DELETE FROM activity`)
	return err
}
