// Package config provides centralized, validated configuration for the Notemind backend.
// All configuration is read from environment variables (with .env file support via godotenv).
// Call Validate() immediately after LoadConfig() — it will call log.Fatal on any missing
// required values, ensuring the process fails fast rather than crashing later at runtime.
package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration for the application.
type Config struct {
	// AppEnv controls logging format and behaviour. "production" enables JSON logging.
	AppEnv string

	// Port is the HTTP listen port for the API server (default: "8080").
	Port string

	// DatabaseDSN is the PostgreSQL connection string. REQUIRED.
	DatabaseDSN string

	// RedisAddr is the Redis host:port used by Asynq. REQUIRED.
	RedisAddr string

	// OpenAIAPIKey is the OpenAI API key used for transcription and summarisation. REQUIRED.
	OpenAIAPIKey string

	// VexaAPIBase is the base URL of the Vexa meeting-bot microservice.
	VexaAPIBase string

	// VexaAPIKey is the API key for the Vexa service. Optional — join will fail if absent.
	VexaAPIKey string

	// JWTSecret is used to sign and verify user auth tokens. REQUIRED.
	JWTSecret string

	// ── Zoom OAuth ───────────────────────────────────────────────────────────
	ZoomClientID     string
	ZoomClientSecret string
	ZoomRedirectURI  string

	// ── Object storage (S3-compatible) ───────────────────────────────────────
	StorageProvider  string // "s3" | "r2" | "minio"
	StorageBucket    string
	StorageRegion    string
	StorageAccessKey string
	StorageSecretKey string
	StorageEndpoint  string // leave empty for AWS S3

	// ── Google Login OAuth (openid, email, profile) ──────────────────────────
	GoogleAuthClientID     string
	GoogleAuthClientSecret string
	GoogleAuthRedirectURI  string

	// ── Google Calendar OAuth ─────────────────────────────────────────────────
	GoogleCalClientID     string
	GoogleCalClientSecret string
	GoogleCalRedirectURI  string

	// ── Notifications ─────────────────────────────────────────────────────────
	ResendAPIKey string // or SendGrid
	EmailFrom    string

	// ── AI Memory / Embeddings ────────────────────────────────────────────────
	EmbeddingModel      string
	EmbeddingDimensions int
	MaxEmbeddingBatch   int

	// ── CORS ─────────────────────────────────────────────────────────────────
	// Comma-separated list of allowed origins, e.g. "http://localhost:3000,https://app.notemind.ai"
	AllowedOrigins string

	// FrontendURL is the base URL of the Next.js frontend, used for OAuth redirects.
	FrontendURL string

	// APIBaseURL is the public-facing base URL of the API server, used for building
	// callback URLs in outgoing emails (e.g. magic-link verify links).
	APIBaseURL string

	// ── Stripe Billing ────────────────────────────────────────────────────────
	StripeSecretKey     string
	StripeWebhookSecret string
}

// LoadConfig reads configuration from the environment (and an optional .env file).
// Always call Validate() on the returned Config before continuing startup.
func LoadConfig() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("[config] No .env file found — relying on environment variables")
	}

	return &Config{
		AppEnv:       getEnv("APP_ENV", "development"),
		Port:         getEnv("PORT", "8080"),
		DatabaseDSN:  getEnv("POSTGRES_DSN", ""),
		RedisAddr:    getEnv("REDIS_ADDR", ""),
		OpenAIAPIKey: getEnv("OPENAI_API_KEY", ""),
		VexaAPIBase:  getEnv("VEXA_API_BASE", "http://localhost:8056"),
		VexaAPIKey:   getEnv("VEXA_API_KEY", ""),
		JWTSecret:    getEnv("JWT_SECRET", ""),

		// Zoom
		ZoomClientID:     getEnv("ZOOM_CLIENT_ID", ""),
		ZoomClientSecret: getEnv("ZOOM_CLIENT_SECRET", ""),
		ZoomRedirectURI:  getEnv("ZOOM_REDIRECT_URI", "http://localhost:8080/auth/zoom/callback"),

		// Storage
		StorageProvider:  getEnv("STORAGE_PROVIDER", "s3"),
		StorageBucket:    getEnv("STORAGE_BUCKET", ""),
		StorageRegion:    getEnv("STORAGE_REGION", "us-east-1"),
		StorageAccessKey: getEnv("STORAGE_ACCESS_KEY", ""),
		StorageSecretKey: getEnv("STORAGE_SECRET_KEY", ""),
		StorageEndpoint:  getEnv("STORAGE_ENDPOINT", ""),

		// Google Login
		GoogleAuthClientID:     getEnv("GOOGLE_AUTH_CLIENT_ID", ""),
		GoogleAuthClientSecret: getEnv("GOOGLE_AUTH_CLIENT_SECRET", ""),
		GoogleAuthRedirectURI:  getEnv("GOOGLE_AUTH_REDIRECT_URI", "http://localhost:8080/auth/google/callback"),

		// Google Calendar
		GoogleCalClientID:     getEnv("GOOGLE_CAL_CLIENT_ID", ""),
		GoogleCalClientSecret: getEnv("GOOGLE_CAL_CLIENT_SECRET", ""),
		GoogleCalRedirectURI:  getEnv("GOOGLE_CAL_REDIRECT_URI", "http://localhost:8080/auth/google-calendar/callback"),

		// Notifications
		ResendAPIKey: getEnv("RESEND_API_KEY", ""),
		EmailFrom:    getEnv("EMAIL_FROM", "noreply@notemind.ai"),

		// AI Memory
		EmbeddingModel:      getEnv("EMBEDDING_MODEL", "text-embedding-3-small"),
		EmbeddingDimensions: getEnvAsInt("EMBEDDING_DIMENSIONS", 1536),
		MaxEmbeddingBatch:   getEnvAsInt("MAX_EMBEDDING_BATCH", 100),

		// CORS
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:3000"),

		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		APIBaseURL:  getEnv("API_BASE_URL", "http://localhost:8080"),

		// Stripe
		StripeSecretKey:     getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", ""),
	}
}

// getEnvAsInt helps parse int environment variables
func getEnvAsInt(key string, fallback int) int {
	if val, ok := os.LookupEnv(key); ok {
		import_strconv_v, err := strconv.Atoi(val)
		if err == nil {
			return import_strconv_v
		}
	}
	return fallback
}

// Validate checks that all required configuration values are present.
// It calls log.Fatal with a descriptive message listing every missing variable,
// ensuring the process never starts in a broken state.
func (c *Config) Validate() {
	type check struct {
		name  string
		value string
	}

	required := []check{
		{"POSTGRES_DSN", c.DatabaseDSN},
		{"REDIS_ADDR", c.RedisAddr},
		{"OPENAI_API_KEY", c.OpenAIAPIKey},
		{"JWT_SECRET", c.JWTSecret},
	}

	var missing []string
	for _, r := range required {
		if strings.TrimSpace(r.value) == "" {
			missing = append(missing, r.name)
		}
	}

	if len(missing) > 0 {
		log.Fatalf(
			"[config] FATAL: missing required environment variables: %s\n"+
				"Set them in your .env file or deployment environment and restart.",
			strings.Join(missing, ", "),
		)
	}
}

// ValidateWorker is a subset of Validate used by the worker binary.
// The worker does not need JWT_SECRET but does need DB + Redis + OpenAI.
func (c *Config) ValidateWorker() {
	type check struct {
		name  string
		value string
	}

	required := []check{
		{"POSTGRES_DSN", c.DatabaseDSN},
		{"REDIS_ADDR", c.RedisAddr},
		{"OPENAI_API_KEY", c.OpenAIAPIKey},
	}

	var missing []string
	for _, r := range required {
		if strings.TrimSpace(r.value) == "" {
			missing = append(missing, r.name)
		}
	}

	if len(missing) > 0 {
		log.Fatalf(
			"[config] FATAL: worker missing required environment variables: %s",
			strings.Join(missing, ", "),
		)
	}
}

// IsProduction returns true when running in a production environment.
func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

// DSNRedacted returns the DSN with the password replaced by ***
// for safe logging.
func (c *Config) DSNRedacted() string {
	// postgres://user:PASSWORD@host:port/db?...
	// Replace everything between the first ':' after '//' and the '@'
	dsn := c.DatabaseDSN
	atIdx := strings.LastIndex(dsn, "@")
	colonIdx := strings.Index(dsn, "://")
	if colonIdx == -1 || atIdx == -1 {
		return "[invalid DSN]"
	}
	userPart := dsn[colonIdx+3 : atIdx]
	parts := strings.SplitN(userPart, ":", 2)
	if len(parts) == 2 {
		return fmt.Sprintf("%s%s:***@%s", dsn[:colonIdx+3], parts[0], dsn[atIdx+1:])
	}
	return dsn
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
