package auth

// User + session store on Postgres (GORM).
//
// Passwords are bcrypt hashes. Tokens are 256-bit opaque bearers.

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/homelab/filemanager/internal/db"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	RoleAdmin  = "admin"
	RoleMember = "member"
)

type User struct {
	ID           string `gorm:"primaryKey" json:"id"`
	Username     string `gorm:"uniqueIndex;not null" json:"username"`
	DisplayName  string `json:"display_name"`
	Role         string `json:"role"`
	PasswordHash string `json:"password_hash,omitempty"`
	CreatedAt    string `json:"created_at"`
}

func (u *User) Public() *User {
	c := *u
	c.PasswordHash = ""
	return &c
}

type Session struct {
	Token     string `gorm:"primaryKey" json:"token"`
	UserID    string `gorm:"index;not null" json:"user_id"`
	Username  string `json:"username"`
	CreatedAt string `json:"created_at"`
	ExpiresAt string `json:"expires_at"`
	IP        string `json:"ip,omitempty"`
}

const sessionTTL = 30 * 24 * time.Hour

var (
	ErrExists      = errors.New("user already exists")
	ErrNotFound    = errors.New("user not found")
	ErrBadPassword = errors.New("invalid username or password")
	ErrLastAdmin   = errors.New("cannot remove the last admin")
)

type Store struct {
	db *gorm.DB
}

func NewStore(dsn string) (*Store, error) {
	database, err := db.Open(dsn, &User{}, &Session{})
	if err != nil {
		return nil, err
	}
	return &Store{db: database}, nil
}

// Ping reports whether the database answers.
func (s *Store) Ping() error { return db.Ping(s.db) }

// isDup reports unique-violation errors on either backend.
func isDup(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "UNIQUE") ||
		strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "23505")
}

func parseTime(v string) time.Time {
	t, _ := time.Parse(time.RFC3339Nano, v)
	if t.IsZero() {
		t, _ = time.Parse(time.RFC3339, v)
	}
	return t.UTC()
}

// ---- users ----

func (s *Store) Count() int {
	var n int64
	if err := s.db.Model(&User{}).Count(&n).Error; err != nil {
		return 0
	}
	return int(n)
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

	var exists int64
	if err := s.db.Model(&User{}).Where("username = ?", username).Count(&exists).Error; err != nil {
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
		CreatedAt:    time.Now().UTC().Format(time.RFC3339Nano),
	}
	if err := s.db.Create(u).Error; err != nil {
		if isDup(err) {
			return nil, ErrExists
		}
		return nil, err
	}
	return u.Public(), nil
}

func (s *Store) ListUsers() []*User {
	out := []*User{}
	_ = s.db.Order("created_at ASC").Find(&out).Error
	for _, u := range out {
		u.PasswordHash = ""
	}
	return out
}

func (s *Store) getFull(username string) (*User, error) {
	var u User
	if err := s.db.Where("username = ?", normalize(username)).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBadPassword
		}
		return nil, err
	}
	return &u, nil
}

func (s *Store) getByID(id string) (*User, error) {
	var u User
	if err := s.db.Where("id = ?", id).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
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
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&User{}).Where("id = ?", id).
			Updates(map[string]any{"display_name": u.DisplayName, "role": u.Role}).Error; err != nil {
			return err
		}
		if newPassword != "" {
			if len(newPassword) < 4 {
				return errors.New("password must be at least 4 characters")
			}
			hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
			if err != nil {
				return err
			}
			if err := tx.Model(&User{}).Where("id = ?", id).
				Update("password_hash", string(hash)).Error; err != nil {
				return err
			}
			// Invalidate existing sessions after a password reset.
			if err := tx.Where("user_id = ?", id).Delete(&Session{}).Error; err != nil {
				return err
			}
			u.PasswordHash = string(hash)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return u.Public(), nil
}

func (s *Store) adminCount() int {
	var n int64
	_ = s.db.Model(&User{}).Where("role = ?", RoleAdmin).Count(&n).Error
	return int(n)
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
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", id).Delete(&Session{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", id).Delete(&User{}).Error
	})
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
		CreatedAt: now.Format(time.RFC3339Nano),
		ExpiresAt: now.Add(sessionTTL).Format(time.RFC3339Nano),
		IP:        ip,
	}
	if err := s.db.Create(sess).Error; err != nil {
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
	if err := s.db.Where("token = ?", token).First(&sess).Error; err != nil {
		return nil, nil
	}
	if time.Now().After(parseTime(sess.ExpiresAt)) {
		_ = s.db.Where("token = ?", token).Delete(&Session{}).Error
		return nil, nil
	}
	u, err := s.getByID(sess.UserID)
	if err != nil {
		_ = s.db.Where("token = ?", token).Delete(&Session{}).Error
		return nil, nil
	}
	return u.Public(), &sess
}

func (s *Store) Revoke(token string) {
	_ = s.db.Where("token = ?", strings.TrimSpace(token)).Delete(&Session{}).Error
}
