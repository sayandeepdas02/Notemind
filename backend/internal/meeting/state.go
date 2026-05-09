package meeting

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// MeetingState represents the deterministic lifecycle states of a meeting.
type MeetingState string

const (
	StateCreated             MeetingState = "CREATED"
	StateScheduled           MeetingState = "SCHEDULED"
	StateJoining             MeetingState = "JOINING"
	StateWaitingForAdmission MeetingState = "WAITING_FOR_ADMISSION"
	StateAdmitted            MeetingState = "ADMITTED"
	StateRecording           MeetingState = "RECORDING"
	StateTranscribing        MeetingState = "TRANSCRIBING"
	StateReconnecting        MeetingState = "RECONNECTING"
	StateDisconnected        MeetingState = "DISCONNECTED"
	StateDenied              MeetingState = "DENIED"
	StateFailed              MeetingState = "FAILED"
	StateEnded               MeetingState = "ENDED"
)

// validTransitions defines allowed state changes.
var validTransitions = map[MeetingState]map[MeetingState]bool{
	StateCreated: {
		StateScheduled: true,
		StateJoining:   true,
		StateFailed:    true,
	},
	StateScheduled: {
		StateJoining: true,
		StateFailed:  true,
	},
	StateJoining: {
		StateWaitingForAdmission: true,
		StateAdmitted:            true,
		StateDenied:              true,
		StateFailed:              true,
		StateDisconnected:        true,
	},
	StateWaitingForAdmission: {
		StateAdmitted:     true,
		StateDenied:       true,
		StateFailed:       true,
		StateDisconnected: true,
	},
	StateAdmitted: {
		StateRecording:    true,
		StateFailed:       true,
		StateDisconnected: true,
		StateEnded:        true,
	},
	StateRecording: {
		StateTranscribing: true,
		StateReconnecting: true,
		StateDisconnected: true,
		StateFailed:       true,
		StateEnded:        true,
	},
	StateTranscribing: {
		StateEnded:  true,
		StateFailed: true,
	},
	StateReconnecting: {
		StateJoining:      true,
		StateRecording:    true,
		StateDisconnected: true,
		StateFailed:       true,
		StateEnded:        true,
	},
	StateDisconnected: {
		StateReconnecting: true,
		StateFailed:       true,
		StateEnded:        true,
	},
	StateDenied: {
		// Terminal, but maybe user retries
		StateReconnecting: true,
	},
	StateFailed: {}, // Terminal
	StateEnded:  {}, // Terminal
}

// CanTransition checks if the transition is allowed.
func CanTransition(from, to MeetingState) bool {
	if from == to {
		return true // No-op is valid
	}
	allowed, exists := validTransitions[from]
	return exists && allowed[to]
}

// TransitionState applies a guarded state transition and writes to the audit log.
func TransitionState(ctx context.Context, meetingID string, to MeetingState, reason string) error {
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Lock the row to prevent race conditions during state transition
	var currentStatus string
	var retryCount int
	err = tx.QueryRowContext(ctx, "SELECT status, retry_count FROM meetings WHERE id = $1 FOR UPDATE", meetingID).
		Scan(&currentStatus, &retryCount)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("meeting not found")
		}
		return err
	}

	fromState := MeetingState(currentStatus)
	
	if !CanTransition(fromState, to) {
		logger.L.Warn("invalid state transition attempted",
			zap.String("meeting_id", meetingID),
			zap.String("from", string(fromState)),
			zap.String("to", string(to)),
		)
		return fmt.Errorf("invalid transition from %s to %s", fromState, to)
	}

	if fromState == to {
		// Update reason/timestamps only
		_, err = tx.ExecContext(ctx, "UPDATE meetings SET state_reason = $1, updated_at = NOW() WHERE id = $2", reason, meetingID)
		if err != nil {
			return err
		}
		return tx.Commit()
	}

	if to == StateReconnecting {
		retryCount++
	}

	// Update meeting
	_, err = tx.ExecContext(ctx, `
		UPDATE meetings 
		SET status = $1, state_reason = $2, retry_count = $3, updated_at = NOW()
		WHERE id = $4`,
		string(to), reason, retryCount, meetingID)
	if err != nil {
		return err
	}

	// Insert audit log
	_, err = tx.ExecContext(ctx, `
		INSERT INTO meeting_state_transitions (id, meeting_id, from_state, to_state, reason)
		VALUES ($1, $2, $3, $4, $5)`,
		uuid.New().String(), meetingID, string(fromState), string(to), reason)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// Heartbeat updates the last_heartbeat_at timestamp.
func Heartbeat(ctx context.Context, meetingID string) error {
	_, err := db.DB.ExecContext(ctx, "UPDATE meetings SET last_heartbeat_at = NOW() WHERE id = $1", meetingID)
	return err
}
