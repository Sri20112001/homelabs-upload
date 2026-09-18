package auth

// User + session store backed by embedded SQLite — no server to install.
// One file, sibling of STORAGE_ROOT (never inside served files):
//
//	<parent-of-storage>/.nodevault/nodevault.db  (tables: users, sessions)
//
// Passwords are bcrypt hashes. Tokens are 256-bit opaque bearers.
// First-run JSON files (users.json/sessions.json) are imported once, then ignored.

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/homelab/filemanager/internal/db"
	"golang.org/x/crypto/bcrypt"
)

const (
	RoleAdmin  = "admin"
	RoleMember = "member"
)

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	DisplayName  string    `json:"display_name"`
	Role         string    `json:"role"`
	PasswordHash string    `json:"password_hash,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

func (u *User) Public() *User {
	c := *u
	c.PasswordHash = ""
	return &c
}

type Session struct {
	Token     string    `json:"token"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	IP        string    `json:"ip,omitempty"`
}

const sessionTTL = 30 * 24 * time.Hour

var (
	ErrExists      = errors.New("user already exists")
	ErrNotFound    = errors.New("user not found")
	ErrBadPassword = errors.New("invalid username or password")
	ErrLastAdmin   = errors.New("cannot remove the last admin")
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
	if err := s.importLegacyJSON(); err != nil {
		_ = database.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Dir() string { return s.dir }

func parseTime(v string) time.Time {
	t, _ := time.Parse(time.RFC3339Nano, v)
	if t.IsZero() {
		t, _ = time.Parse(time.RFC3339, v)
	}
	return t.UTC()
}

func scanUser(row interface {
	Scan(dest ...any) error
}) (*User, error) {
	var u User
	var created string
	if err := row.Scan(&u.ID, &u.Username, &u.DisplayName, &u.Role, &u.PasswordHash, &created); err != nil {
		return nil, err
	}
	u.CreatedAt = parseTime(created)
	return &u, nil
}

// importLegacyJSON migrates users.json/sessions.json once (pre-SQLite installs).
func (s *Store) importLegacyJSON() error {
	var n int
	if err := s.database.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	data, err := os.ReadFile(filepath.Join(s.dir, "users.json"))
	if err != nil || len(data) == 0 {
		return nil
	}
	var users []*User
	if err := json.Unmarshal(data, &users); err != nil {
		return nil // corrupt legacy file: start fresh rather than fail boot
	}
	tx, err := s.database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, u := range users {
		if u.ID == "" || u.Username == "" {
			continue
		}
		created := u.CreatedAt.UTC().Format(time.RFC3339Nano)
		if _, err := tx.Exec(
			`INSERT OR IGNORE INTO users(id,username,display_name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)`,
			u.ID, u.Username, u.DisplayName, u.Role, u.PasswordHash, created,
		); err != nil {
			return err
		}
	}
	if data, err := os.ReadFile(filepath.Join(s.dir, "sessions.json")); err == nil && len(data) > 0 {
		var sessions []*Session
		if err := json.Unmarshal(data, &sessions); err == nil {
			for _, sess := range sessions {
				if sess.Token == "" || !sess.ExpiresAt.After(time.Now()) {
					continue
				}
				_, _ = tx.Exec(
					`INSERT OR IGNORE INTO sessions(token,user_id,username,created_at,expires_at,ip) VALUES(?,?,?,?,?,?)`,
					sess.Token, sess.UserID, sess.Username,
					sess.CreatedAt.UTC().Format(time.RFC3339Nano),
					sess.ExpiresAt.UTC().Format(time.RFC3339Nano),
					sess.IP,
				)
			}
		}
	}
	return tx.Commit()
}

// ---- users ----

func (s *Store) Count() int {
	var n int
	if err := s.database.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n); err != nil {
		return 0
	}
	return n
}

func (s *Store) SetupNeeded() bool { return s.Count() == 0 }

func normalize(name string) string { return strings.ToLower(strings.TrimSpace(name)) }

// CreateUser adds a user. The very first user is forced to admin.
func (s *Store) CreateUser(username, displayName, password, role string) (*User, error) {
	username = normalize(username)
	if n := len([]rune(username)); n < 1 || n > 64 {
		return nil, errors.New("username must be 1-64 characters")
	}
	if len(password) < 4 {
		return nil, errors.New("password must be at least 4 characters")
	}
	if role != RoleAdmin && role != RoleMember {
		role = RoleMember
	}
	if strings.TrimSpace(displayName) == "" {
		displayName = strings.ToUpper(username[:1]) + username[1:]
	}

	var exists int
	if err := s.database.QueryRow(`SELECT COUNT(*) FROM users WHERE username=?`, username).Scan(&exists); err != nil {
		return nil, err
	}
	if exists > 0 {
		return nil, ErrExists
	}
	if s.Count() == 0 {
		role = RoleAdmin // first user owns the node
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	u := &User{
		ID:           newID(),
		Username:     username,
		DisplayName:  displayName,
		Role:         role,
		PasswordHash: string(hash),
		CreatedAt:    time.Now().UTC(),
	}
	if _, err := s.database.Exec(
		`INSERT INTO users(id,username,display_name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)`,
		u.ID, u.Username, u.DisplayName, u.Role, u.PasswordHash, u.CreatedAt.Format(time.RFC3339Nano),
	); err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return nil, ErrExists
		}
		return nil, err
	}
	return u.Public(), nil
}

func (s *Store) ListUsers() []*User {
	rows, err := s.database.Query(
		`SELECT id,username,display_name,role,password_hash,created_at FROM users ORDER BY created_at ASC`)
	if err != nil {
		return []*User{}
	}
	defer rows.Close()
	out := []*User{}
	for rows.Next() {
		var u User
		var created string
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.Role, &u.PasswordHash, &created); err != nil {
			continue
		}
		u.CreatedAt = parseTime(created)
		out = append(out, u.Public())
	}
	return out
}

func (s *Store) getFull(username string) (*User, error) {
	u, err := scanUser(s.database.QueryRow(
		`SELECT id,username,display_name,role,password_hash,created_at FROM users WHERE username=?`, normalize(username)))
	if err == sql.ErrNoRows {
		return nil, ErrBadPassword
	}
	return u, err
}

func (s *Store) getByID(id string) (*User, error) {
	u, err := scanUser(s.database.QueryRow(
		`SELECT id,username,display_name,role,password_hash,created_at FROM users WHERE id=?`, id))
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return u, err
}

func (s *Store) Verify(username, password string) (*User, error) {
	u, err := s.getFull(username)
	if err != nil {
		return nil, ErrBadPassword
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, ErrBadPassword
	}
	return u.Public(), nil
}

// UpdateUser lets an admin change display name, role or password.
func (s *Store) UpdateUser(id, displayName, role, newPassword string) (*User, error) {
	u, err := s.getByID(id)
	if err != nil {
		return nil, err
	}
	if displayName != "" {
		u.DisplayName = displayName
	}
	if role == RoleAdmin || role == RoleMember {
		if u.Role == RoleAdmin && role == RoleMember && s.adminCount() <= 1 {
			return nil, ErrLastAdmin
		}
		u.Role = role
	}
	tx, err := s.database.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`UPDATE users SET display_name=?, role=? WHERE id=?`, u.DisplayName, u.Role, id); err != nil {
		return nil, err
	}
	if newPassword != "" {
		if len(newPassword) < 4 {
			return nil, errors.New("password must be at least 4 characters")
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`UPDATE users SET password_hash=? WHERE id=?`, string(hash), id); err != nil {
			return nil, err
		}
		// Invalidate existing sessions after a password reset.
		if _, err := tx.Exec(`DELETE FROM sessions WHERE user_id=?`, id); err != nil {
			return nil, err
		}
		u.PasswordHash = string(hash)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return u.Public(), nil
}

func (s *Store) adminCount() int {
	var n int
	_ = s.database.QueryRow(`SELECT COUNT(*) FROM users WHERE role='admin'`).Scan(&n)
	return n
}

func (s *Store) DeleteUser(id, selfID string) error {
	u, err := s.getByID(id)
	if err != nil {
		return err
	}
	if id == selfID {
		return errors.New("you cannot delete your own account")
	}
	if u.Role == RoleAdmin && s.adminCount() <= 1 {
		return ErrLastAdmin
	}
	tx, err := s.database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM sessions WHERE user_id=?`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM users WHERE id=?`, id); err != nil {
		return err
	}
	return tx.Commit()
}

// ---- sessions ----

func newID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func newToken() string {
	var b [32]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func (s *Store) CreateSession(user *User, ip string) (*Session, error) {
	full, err := s.getByID(user.ID)
	if err != nil {
		return nil, ErrNotFound
	}
	now := time.Now().UTC()
	sess := &Session{
		Token:     newToken(),
		UserID:    full.ID,
		Username:  full.Username,
		CreatedAt: now,
		ExpiresAt: now.Add(sessionTTL),
		IP:        ip,
	}
	if _, err := s.database.Exec(
		`INSERT INTO sessions(token,user_id,username,created_at,expires_at,ip) VALUES(?,?,?,?,?,?)`,
		sess.Token, sess.UserID, sess.Username,
		sess.CreatedAt.Format(time.RFC3339Nano), sess.ExpiresAt.Format(time.RFC3339Nano), sess.IP,
	); err != nil {
		return nil, err
	}
	return sess, nil
}

func (s *Store) Lookup(token string) (*User, *Session) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, nil
	}
	var sess Session
	var created, expires string
	err := s.database.QueryRow(
		`SELECT token,user_id,username,created_at,expires_at,ip FROM sessions WHERE token=?`, token,
	).Scan(&sess.Token, &sess.UserID, &sess.Username, &created, &expires, &sess.IP)
	if err != nil {
		return nil, nil
	}
	sess.CreatedAt, sess.ExpiresAt = parseTime(created), parseTime(expires)
	if time.Now().After(sess.ExpiresAt) {
		_, _ = s.database.Exec(`DELETE FROM sessions WHERE token=?`, token)
		return nil, nil
	}
	u, err := s.getByID(sess.UserID)
	if err != nil {
		_, _ = s.database.Exec(`DELETE FROM sessions WHERE token=?`, token)
		return nil, nil
	}
	return u.Public(), &sess
}

func (s *Store) Revoke(token string) {
	_, _ = s.database.Exec(`DELETE FROM sessions WHERE token=?`, strings.TrimSpace(token))
}
