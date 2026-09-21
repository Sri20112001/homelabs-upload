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
//
// Log tables (activity, app_logs) are append-only: after migrating, Open
// installs immutability triggers that reject UPDATE and DELETE rows, so
// log records can never be altered or removed — not even by admins or by
// direct SQL. Retention/purge is intentionally unsupported.
func Open(dsn string, models ...any) (*gorm.DB, error) {
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("postgres connect: %w", err)
	}
	if err := database.AutoMigrate(models...); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	if err := enforceAppendOnlyLogs(database); err != nil {
		return nil, fmt.Errorf("enforce append-only logs: %w", err)
	}
	return database, nil
}

// appendOnlyLogTables are the audit surfaces. Anything written here must
// survive forever: no UPDATE, no DELETE, no TRUNCATE-via-ORM.
var appendOnlyLogTables = []string{"activity", "app_logs"}

// enforceAppendOnlyLogs installs a shared trigger function plus one
// BEFORE UPDATE OR DELETE trigger per log table. The trigger raises an
// exception, aborting any mutation transaction. INSERT stays allowed, so
// normal logging is unaffected. Re-running is idempotent (CREATE OR REPLACE
// + DROP IF EXISTS), which also repairs a manually-dropped trigger on the
// next boot/connect.
func enforceAppendOnlyLogs(database *gorm.DB) error {
	const fn = `
CREATE OR REPLACE FUNCTION reject_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only: logs cannot be altered or deleted (TG_OP=%)', TG_TABLE_NAME, TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;`
	if err := database.Exec(fn).Error; err != nil {
		return err
	}
	for _, table := range appendOnlyLogTables {
		trigger := fmt.Sprintf("trg_%s_append_only", table)
		// Quote identifiers via format to keep table/trigger names safe;
		// names come from a fixed allowlist above, never user input.
		sql := fmt.Sprintf(`
DO $$
BEGIN
  IF to_regclass('public.%[1]s') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS %[2]s ON public.%[1]s;
    CREATE TRIGGER %[2]s
      BEFORE UPDATE OR DELETE ON public.%[1]s
      FOR EACH ROW EXECUTE FUNCTION reject_log_mutation();
    -- TRUNCATE bypasses row triggers: block it with a rule instead.
    DROP RULE IF EXISTS %[2]s_no_truncate ON public.%[1]s;
    CREATE RULE %[2]s_no_truncate AS ON TRUNCATE TO public.%[1]s DO INSTEAD NOTHING;
  END IF;
END
$$;`, table, trigger)
		if err := database.Exec(sql).Error; err != nil {
			return fmt.Errorf("%s: %w", table, err)
		}
	}
	return nil
}

// Ping reports whether the database answers.
func Ping(database *gorm.DB) error {
	sqlDB, err := database.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
