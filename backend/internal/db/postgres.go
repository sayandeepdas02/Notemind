// Package db manages the PostgreSQL connection pool and schema migrations.
package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "github.com/lib/pq"
	"go.uber.org/zap"

	"notemind/pkg/logger"
)

// DB is the application-wide database connection pool.
// It is safe for concurrent use.
var DB *sql.DB

//go:embed migrations/*.sql
var migrationFiles embed.FS

// InitDB opens a connection pool to PostgreSQL, configures pool sizing,
// and runs all pending migrations. It will return an error if the DB is
// unreachable or any migration fails.
func InitDB(dsn string) error {
	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database connection: %w", err)
	}

	// Connection pool tuning
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)
	DB.SetConnMaxIdleTime(2 * time.Minute)

	// Verify connectivity
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := DB.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	logger.L.Info("Connected to PostgreSQL")

	// Run migrations
	if err := runMigrations(DB); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// Ping checks if the database connection is alive.
// Uses a 2-second timeout — safe to call from the health endpoint.
func Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return DB.PingContext(ctx)
}

// runMigrations applies all pending migrations from the embedded migrations/ directory.
func runMigrations(db *sql.DB) error {
	// Source: read from the embedded FS
	src, err := iofs.New(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("failed to create migration source: %w", err)
	}

	// Driver: postgres
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		return fmt.Errorf("failed to initialise migrate: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration failed: %w", err)
	}

	version, dirty, vErr := m.Version()
	if vErr == nil {
		logger.L.Info("Migrations applied",
			zap.Uint("schema_version", version),
			zap.Bool("dirty", dirty),
		)
	} else {
		logger.L.Info("Migrations up to date (no schema_migrations table version returned)")
	}

	return nil
}
