package intelligence

import (
	"context"
	"fmt"

	"notemind/internal/db"
	"notemind/internal/workspace"
)

// Decision represents a resolved decision extracted from a meeting.
type Decision struct {
	ID        string
	UserID    string
	MeetingID string
	Content   string
}

// DecisionService handles cross-meeting decision tracking.
type DecisionService struct{}

func NewDecisionService() *DecisionService {
	return &DecisionService{}
}

// TrackDecision logs a decision.
func (s *DecisionService) TrackDecision(ctx context.Context, d Decision) error {
	// For simplicity, we store decisions in the meeting_entities table under the 'decision' type.
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO meeting_entities (meeting_id, entity_type, name)
		VALUES ($1, 'decision', $2)
		ON CONFLICT DO NOTHING
	`, d.MeetingID, d.Content)
	return err
}

// GetUserDecisions fetches all decisions for a user's workspace.
func (s *DecisionService) GetUserDecisions(ctx context.Context, userID string) ([]Decision, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}
	rows, err := db.DB.QueryContext(ctx, `
		SELECT e.id, e.meeting_id, e.name
		FROM meeting_entities e
		JOIN meetings m ON m.id = e.meeting_id
		WHERE m.workspace_id = $1 AND e.entity_type = 'decision'
		ORDER BY e.created_at DESC
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var decisions []Decision
	for rows.Next() {
		d := Decision{UserID: userID}
		if err := rows.Scan(&d.ID, &d.MeetingID, &d.Content); err != nil {
			return nil, err
		}
		decisions = append(decisions, d)
	}
	return decisions, nil
}
