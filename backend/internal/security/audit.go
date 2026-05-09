package security

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// AuditEvent represents a single immutable action within a workspace.
type AuditEvent struct {
	WorkspaceID  string
	ActorID      *string // Null if system action
	Action       string  // e.g., 'user.invited', 'billing.updated'
	ResourceType string
	ResourceID   string
	Metadata     map[string]interface{}
	IPAddress    string
}

type AuditLogger struct{}

func NewAuditLogger() *AuditLogger {
	return &AuditLogger{}
}

// Log records an audit event. It is fire-and-forget; failure to log
// does not block the main application flow, but is logged as a system error.
func (a *AuditLogger) Log(event AuditEvent) {
	// Run in background
	go func() {
		ctx := context.Background()
		var metaJSON []byte
		if event.Metadata != nil {
			metaJSON, _ = json.Marshal(event.Metadata)
		}

		_, err := db.DB.ExecContext(ctx, `
			INSERT INTO audit_logs (id, workspace_id, actor_id, action, resource_type, resource_id, metadata, ip_address)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, uuid.New().String(), event.WorkspaceID, event.ActorID, event.Action, event.ResourceType, event.ResourceID, metaJSON, event.IPAddress)

		if err != nil {
			logger.L.Error("failed to write audit log", zap.Error(err), zap.String("action", event.Action))
		}
	}()
}

// GetLogs retrieves the audit trail for a workspace.
func (a *AuditLogger) GetLogs(ctx context.Context, workspaceID string, limit int) ([]interface{}, error) {
	// Implementation omitted for brevity, would query audit_logs table
	return nil, fmt.Errorf("not implemented")
}
