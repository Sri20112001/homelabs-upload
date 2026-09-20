package db

// Postgres-only database layer (GORM).
//
// Each store package passes its own models to Open for AutoMigrate.

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Open connects to Postgres and auto-migrates models. It fails fast when
// the server is unreachable — the database is mandatory, not optional.
func Open(dsn string, models ...any) (*gorm.DB, error) {
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("postgres connect: %w", err)
	}
	if err := database.AutoMigrate(models...); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return database, nil
}

// Ping reports whether the database answers.
func Ping(database *gorm.DB) error {
	sqlDB, err := database.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
