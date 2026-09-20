package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Host          string
	Port          string
	StorageRoot   string
	MaxUploadSize int64
	CORSOrigin    string
	APIKey        string
	// DatabaseURL is the Postgres DSN, e.g.
	// postgres://user:pass@postgres:5432/nodevault?sslmode=disable.
	// The database is mandatory — boot fails fast without it.
	DatabaseURL string
}

func Load() (*Config, error) {
	// .env is optional; ignore error if not present.
	// Try CWD first (docker / server root), then fall back to parent dirs
	// so `air` / `go run` from cmd/server still picks up server/.env.
	// Load each separately so a missing .env in CWD doesn't block the fallbacks.
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	cfg := &Config{
		Host:          getEnv("SERVER_HOST", "0.0.0.0"),
		Port:          getEnv("SERVER_PORT", "8080"),
		StorageRoot:   getEnv("STORAGE_ROOT", "/data/files"),
		MaxUploadSize: getEnvInt64("MAX_UPLOAD_SIZE", 10<<30), // 10 GiB
		CORSOrigin:    getEnv("CORS_ORIGIN", "http://localhost:5173"),
		APIKey:        getEnv("API_KEY", ""),
		DatabaseURL:   getEnv("DATABASE_URL", "postgresql://postgres:sri20112001@localhost:5432/nodevault?sslmode=disable"),
	}

	return cfg, cfg.validate()
}

func (c *Config) validate() error {
	if c.StorageRoot == "" {
		return errors.New("STORAGE_ROOT must be set")
	}
	info, err := os.Stat(c.StorageRoot)
	if err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("STORAGE_ROOT %q: %w", c.StorageRoot, err)
		}
		// Auto-create missing storage root (dev convenience; in Docker
		// the volume mount already provides /data/files).
		if mkErr := os.MkdirAll(c.StorageRoot, 0755); mkErr != nil {
			return fmt.Errorf("STORAGE_ROOT %q: cannot create directory: %w", c.StorageRoot, mkErr)
		}
		return nil
	}
	if !info.IsDir() {
		return fmt.Errorf("STORAGE_ROOT %q is not a directory", c.StorageRoot)
	}
	if c.DatabaseURL == "" {
		return errors.New("DATABASE_URL must be set (Postgres is required)")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return fallback
}
