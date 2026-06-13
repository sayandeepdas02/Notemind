// Package automation provides a rule engine for automatic meeting workflows.
// Rules are stored per-user in the DB and evaluated when triggering events occur
// (e.g. calendar event detected, meeting started, participant joined).
package automation

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/internal/workspace"
	"notemind/pkg/logger"
)

// ── Types ─────────────────────────────────────────────────────────────────────

// TriggerEvent is the event type that activates rule evaluation.
type TriggerEvent string

const (
	TriggerMeetingDetected    TriggerEvent = "meeting_detected"     // calendar event with meeting URL found
	TriggerCalendarEventAdded TriggerEvent = "calendar_event_added" // new calendar event synced
	TriggerMeetingStarted     TriggerEvent = "meeting_started"      // bot joined and recording
	TriggerMeetingEnded       TriggerEvent = "meeting_ended"        // meeting finished
)

// ConditionOp is the comparison operator for a rule condition.
type ConditionOp string

const (
	OpEquals     ConditionOp = "eq"
	OpContains   ConditionOp = "contains"
	OpNotContains ConditionOp = "not_contains"
	OpStartsWith ConditionOp = "starts_with"
)

// Condition is a single filter criteria in a rule.
type Condition struct {
	Field string      `json:"field"` // "title", "provider", "attendee_domain", "meeting_url"
	Op    ConditionOp `json:"op"`
	Value string      `json:"value"`
}

// ActionType is what the rule does when triggered and conditions are met.
type ActionType string

const (
	ActionAutoJoin          ActionType = "auto_join"
	ActionSkip              ActionType = "skip"
	ActionAddTag            ActionType = "add_tag"
	ActionSendNotification  ActionType = "send_notification"
	ActionPushToIntegration ActionType = "push_to_integration"
)

// Action is what happens when a rule fires.
type Action struct {
	Type   ActionType             `json:"type"`
	Params map[string]interface{} `json:"params,omitempty"`
}

// Rule is a single automation policy.
type Rule struct {
	ID          string       `json:"id"`
	WorkspaceID string       `json:"workspace_id"`
	Name        string       `json:"name"`
	Trigger     TriggerEvent `json:"trigger"`
	Conditions  []Condition  `json:"conditions"`
	Actions     []Action     `json:"actions"`
	Enabled     bool         `json:"enabled"`
	CreatedAt   time.Time    `json:"created_at"`
}

// EventContext carries the data available when a trigger fires.
type EventContext struct {
	UserID     string
	MeetingURL string
	Title      string
	Provider   string
	Attendees  []string // email list
	Extra      map[string]string
}

// ── Engine ────────────────────────────────────────────────────────────────────

// Engine evaluates automation rules against incoming events.
type Engine struct {
	repo *Repository
}

func NewEngine(repo *Repository) *Engine {
	return &Engine{repo: repo}
}

// Evaluate loads a user's active rules for the given trigger and returns
// the list of Actions that should be executed.
func (e *Engine) Evaluate(ctx context.Context, trigger TriggerEvent, evtCtx EventContext) ([]Action, error) {
	rules, err := e.repo.GetEnabledRules(ctx, evtCtx.UserID, trigger)
	if err != nil {
		return nil, fmt.Errorf("automation: failed to load rules: %w", err)
	}

	var matched []Action
	for _, rule := range rules {
		if matchesAllConditions(rule.Conditions, evtCtx) {
			logger.L.Info("automation rule matched",
				zap.String("rule_id", rule.ID),
				zap.String("rule_name", rule.Name),
				zap.String("user_id", evtCtx.UserID),
			)
			matched = append(matched, rule.Actions...)
		}
	}
	return matched, nil
}

// matchesAllConditions returns true only if every condition in the rule is satisfied.
func matchesAllConditions(conditions []Condition, ctx EventContext) bool {
	for _, c := range conditions {
		if !evalCondition(c, ctx) {
			return false
		}
	}
	return true
}

func evalCondition(c Condition, ctx EventContext) bool {
	var fieldVal string
	switch c.Field {
	case "title":
		fieldVal = ctx.Title
	case "provider":
		fieldVal = ctx.Provider
	case "meeting_url":
		fieldVal = ctx.MeetingURL
	case "attendee_domain":
		// True if any attendee has the given domain
		for _, email := range ctx.Attendees {
			parts := strings.SplitN(email, "@", 2)
			if len(parts) == 2 && strings.EqualFold(parts[1], c.Value) {
				if c.Op == OpContains || c.Op == OpEquals {
					return true
				}
			}
		}
		if c.Op == OpNotContains {
			return true
		}
		return false
	default:
		if ctx.Extra != nil {
			fieldVal = ctx.Extra[c.Field]
		}
	}

	switch c.Op {
	case OpEquals:
		return strings.EqualFold(fieldVal, c.Value)
	case OpContains:
		return strings.Contains(strings.ToLower(fieldVal), strings.ToLower(c.Value))
	case OpNotContains:
		return !strings.Contains(strings.ToLower(fieldVal), strings.ToLower(c.Value))
	case OpStartsWith:
		return strings.HasPrefix(strings.ToLower(fieldVal), strings.ToLower(c.Value))
	}
	return false
}

// ── Repository ────────────────────────────────────────────────────────────────

// Repository handles DB persistence for automation rules.
type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) GetEnabledRules(ctx context.Context, userID string, trigger TriggerEvent) ([]Rule, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, workspace_id, name, trigger, conditions, actions, enabled, created_at
		FROM automation_rules
		WHERE workspace_id = $1 AND trigger = $2 AND enabled = true
		ORDER BY created_at
	`, workspaceID, string(trigger))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []Rule
	for rows.Next() {
		var rule Rule
		var condJSON, actJSON []byte
		var triggerStr string
		if err := rows.Scan(&rule.ID, &rule.WorkspaceID, &rule.Name, &triggerStr,
			&condJSON, &actJSON, &rule.Enabled, &rule.CreatedAt); err != nil {
			return nil, err
		}
		rule.Trigger = TriggerEvent(triggerStr)
		_ = json.Unmarshal(condJSON, &rule.Conditions)
		_ = json.Unmarshal(actJSON, &rule.Actions)
		rules = append(rules, rule)
	}
	return rules, nil
}

func (r *Repository) ListRules(ctx context.Context, userID string) ([]Rule, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, workspace_id, name, trigger, conditions, actions, enabled, created_at
		FROM automation_rules WHERE workspace_id = $1 ORDER BY created_at
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []Rule
	for rows.Next() {
		var rule Rule
		var condJSON, actJSON []byte
		var triggerStr string
		if err := rows.Scan(&rule.ID, &rule.WorkspaceID, &rule.Name, &triggerStr,
			&condJSON, &actJSON, &rule.Enabled, &rule.CreatedAt); err != nil {
			return nil, err
		}
		rule.Trigger = TriggerEvent(triggerStr)
		_ = json.Unmarshal(condJSON, &rule.Conditions)
		_ = json.Unmarshal(actJSON, &rule.Actions)
		rules = append(rules, rule)
	}
	return rules, nil
}

func (r *Repository) CreateRule(ctx context.Context, rule *Rule) error {
	condJSON, _ := json.Marshal(rule.Conditions)
	actJSON, _ := json.Marshal(rule.Actions)
	return db.DB.QueryRowContext(ctx, `
		INSERT INTO automation_rules (workspace_id, name, trigger, conditions, actions, enabled)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`, rule.WorkspaceID, rule.Name, string(rule.Trigger), condJSON, actJSON, rule.Enabled).
		Scan(&rule.ID, &rule.CreatedAt)
}

func (r *Repository) UpdateRule(ctx context.Context, rule *Rule) error {
	condJSON, _ := json.Marshal(rule.Conditions)
	actJSON, _ := json.Marshal(rule.Actions)
	_, err := db.DB.ExecContext(ctx, `
		UPDATE automation_rules
		SET name = $1, trigger = $2, conditions = $3, actions = $4, enabled = $5, updated_at = NOW()
		WHERE id = $6 AND workspace_id = $7
	`, rule.Name, string(rule.Trigger), condJSON, actJSON, rule.Enabled, rule.ID, rule.WorkspaceID)
	return err
}

func (r *Repository) DeleteRule(ctx context.Context, ruleID, userID string) error {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to resolve workspace: %w", err)
	}
	_, err = db.DB.ExecContext(ctx,
		"DELETE FROM automation_rules WHERE id = $1 AND workspace_id = $2", ruleID, workspaceID)
	return err
}
