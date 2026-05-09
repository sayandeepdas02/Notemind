package compliance

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"notemind/internal/db"
)

// DataExport holds all workspace data for a GDPR Subject Access Request.
type DataExport struct {
	WorkspaceID string      `json:"workspace_id"`
	ExportedAt  time.Time   `json:"exported_at"`
	Meetings    interface{} `json:"meetings"`
	AuditLogs   interface{} `json:"audit_logs"`
}

// ExportService handles GDPR data export (DSAR) and deletion requests.
type ExportService struct{}

func NewExportService() *ExportService {
	return &ExportService{}
}

// GenerateWorkspaceExport creates a ZIP archive with all workspace data.
func (s *ExportService) GenerateWorkspaceExport(ctx context.Context, workspaceID string) ([]byte, error) {
	// 1. Fetch all meetings
	meetingRows, err := db.DB.QueryContext(ctx, `
		SELECT id, title, status, created_at FROM meetings WHERE workspace_id = $1
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query meetings: %w", err)
	}
	defer meetingRows.Close()

	var meetings []map[string]interface{}
	for meetingRows.Next() {
		var id, title, status string
		var createdAt time.Time
		if err := meetingRows.Scan(&id, &title, &status, &createdAt); err != nil {
			continue
		}
		meetings = append(meetings, map[string]interface{}{
			"id": id, "title": title, "status": status, "created_at": createdAt,
		})
	}

	// 2. Fetch audit logs
	auditRows, err := db.DB.QueryContext(ctx, `
		SELECT id, actor_id, action, resource_type, resource_id, created_at 
		FROM audit_logs WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 10000
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit logs: %w", err)
	}
	defer auditRows.Close()

	var auditLogs []map[string]interface{}
	for auditRows.Next() {
		var id, action, resourceType, resourceID string
		var actorID *string
		var createdAt time.Time
		if err := auditRows.Scan(&id, &actorID, &action, &resourceType, &resourceID, &createdAt); err != nil {
			continue
		}
		auditLogs = append(auditLogs, map[string]interface{}{
			"id": id, "actor_id": actorID, "action": action,
			"resource_type": resourceType, "resource_id": resourceID, "created_at": createdAt,
		})
	}

	// 3. Package into ZIP
	export := DataExport{
		WorkspaceID: workspaceID,
		ExportedAt:  time.Now(),
		Meetings:    meetings,
		AuditLogs:   auditLogs,
	}

	exportJSON, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	f, err := zw.Create(fmt.Sprintf("notemind_export_%s.json", workspaceID))
	if err != nil {
		return nil, err
	}
	f.Write(exportJSON)
	zw.Close()

	return buf.Bytes(), nil
}

// DeleteWorkspaceData performs a hard-delete of all data for a workspace (Right to Erasure).
func (s *ExportService) DeleteWorkspaceData(ctx context.Context, workspaceID string) error {
	// Cascade deletes are set up via ON DELETE CASCADE on FK constraints.
	// Deleting the workspace will cascade to all child rows.
	_, err := db.DB.ExecContext(ctx, `DELETE FROM workspaces WHERE id = $1`, workspaceID)
	return err
}
