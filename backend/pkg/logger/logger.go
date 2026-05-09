// Package logger provides a structured, zap-backed logger for the Notemind backend.
// In production (APP_ENV=production) it emits JSON to stdout.
// In development it uses the human-readable console encoder.
package logger

import (
	"context"

	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// L is the application-wide structured logger.
// Call Init before using it.
var L *zap.Logger

// Init configures the global logger.
// env should be "production" for JSON output or anything else for console output.
func Init(env string) error {
	var cfg zap.Config

	if env == "production" {
		cfg = zap.NewProductionConfig()
		cfg.EncoderConfig.TimeKey = "ts"
		cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	l, err := cfg.Build(zap.AddCallerSkip(0))
	if err != nil {
		return err
	}

	L = l
	return nil
}

// With returns a child logger with the given fields attached.
// Use this to bind meeting_id, job_id etc. to a request-scoped logger.
func With(fields ...zap.Field) *zap.Logger {
	return L.With(fields...)
}

type correlationIDKey struct{}

// ContextWithCorrelation injects a correlation ID into the context.
func ContextWithCorrelation(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, correlationIDKey{}, id)
}

// WithContext returns a logger enriched with OpenTelemetry trace IDs (if present)
// and any correlation ID injected via ContextWithCorrelation.
func WithContext(ctx context.Context) *zap.Logger {
	if ctx == nil {
		return L
	}
	fields := []zap.Field{}

	// Correlation ID
	if id, ok := ctx.Value(correlationIDKey{}).(string); ok && id != "" {
		fields = append(fields, zap.String("correlation_id", id))
	}

	// OpenTelemetry trace/span IDs
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		fields = append(fields,
			zap.String("trace_id", span.SpanContext().TraceID().String()),
			zap.String("span_id", span.SpanContext().SpanID().String()),
		)
	}

	if len(fields) == 0 {
		return L
	}
	return L.With(fields...)
}

// Sync flushes any buffered log entries. Call defer logger.Sync() in main().
func Sync() {
	if L != nil {
		_ = L.Sync()
	}
}

