package db

// Embedded SQLite — zero setup, no server process.
// One file lives next to (never inside) the served files:
//
//	<parent-of-storage>/.nodevault/nodevault.db
//
// Driver is modernc.org/sqlite: pure Go, no CGO/gcc needed, so it builds
// on Windows, plain Docker images and cross-compiles cleanly.

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// DirForStorage returns the metadata dir for a given STORAGE_ROOT.
func DirForStorage(storageRoot string) (string, error) {
	dir := filepath.Join(filepath.Dir(storageRoot), ".nodevault")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return dir, nil
}

const schema = `
CREATE TABLE IF NOT EXISTS users (
	id          TEXT PRIMARY KEY,
	username    TEXT NOT NULL UNIQUE,
	display_name TEXT NOT NULL DEFAULT '',
	role        TEXT NOT NULL DEFAULT 'member',
	password_hash TEXT NOT NULL DEFAULT '',
	created_at  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
	token      TEXT PRIMARY KEY,
	user_id    TEXT NOT NULL,
	username   TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT '',
	expires_at TEXT NOT NULL DEFAULT '',
	ip         TEXT NOT NULL DEFAULT '',
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS activity (
	id     INTEGER PRIMARY KEY AUTOINCREMENT,
	time   TEXT NOT NULL DEFAULT '',
	user   TEXT NOT NULL DEFAULT '',
	role   TEXT NOT NULL DEFAULT '',
	action TEXT NOT NULL DEFAULT '',
	path   TEXT NOT NULL DEFAULT '',
	detail TEXT NOT NULL DEFAULT '',
	ip     TEXT NOT NULL DEFAULT '',
	status INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity(id DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user, id DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity(action, id DESC);
`

// Open creates (if needed) and migrates the node database.
func Open(dir string) (*sql.DB, error) {
	dsn := filepath.Join(dir, "nodevault.db") +
		"?_pragma=journal_mode(WAL)" +
		"&_pragma=busy_timeout(5000)" +
		"&_pragma=foreign_keys(1)" +
		"&_pragma=synchronous(NORMAL)"
	database, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	database.SetMaxOpenConns(1) // SQLite writes serialize; one conn avoids lock churn
	if _, err := database.Exec(schema); err != nil {
		_ = database.Close()
		return nil, err
	}
	return database, nil
}
