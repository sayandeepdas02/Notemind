// Package queue provides a typed Asynq client for enqueuing background jobs.
// All job types, payloads, and enqueue options are defined here to ensure
// consistent retry behaviour and queue priorities across the application.
package queue

import (
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	"notemind/pkg/logger"
)

// ── Job type constants ────────────────────────────────────────────────────────
// These strings are the Asynq task type identifiers. Workers register handlers
// using these exact strings. Changing them requires a coordinated deploy.

const (
	// TypeTranscriptionJob processes an uploaded audio file through Whisper.
	TypeTranscriptionJob = "transcription:process"

	// TypeBotJoinJob dispatches a Vexa bot to join a live meeting.
	TypeBotJoinJob = "bot:join"

	// TypeAISummaryJob triggers the LLM pipeline to summarize a meeting transcript.
	TypeAISummaryJob = "ai:summarize"

	// TypeEmbedJob triggers the vector embedding pipeline for semantic search.
	TypeEmbedJob = "memory:embed"
)

// ── Queue names ───────────────────────────────────────────────────────────────
// Must match the queue priorities defined in cmd/worker/main.go.

const (
	QueueBot           = "bot"
	QueueTranscription = "transcription"
	QueueAI            = "ai"
)

// ── Payload types ─────────────────────────────────────────────────────────────

// TranscriptionPayload is the job payload for TypeTranscriptionJob.
type TranscriptionPayload struct {
	MeetingID string `json:"meeting_id"`
	FilePath  string `json:"file_path"`
}

// BotJoinPayload is the job payload for TypeBotJoinJob.
type BotJoinPayload struct {
	MeetingID  string `json:"meeting_id"`
	MeetingURL string `json:"meeting_url"`
	UserID     string `json:"user_id"`
}

// AISummaryPayload is the job payload for TypeAISummaryJob.
type AISummaryPayload struct {
	MeetingID string `json:"meeting_id"`
}

// ── Client ────────────────────────────────────────────────────────────────────

// Client wraps an Asynq client with typed enqueue helpers.
type Client struct {
	client *asynq.Client
}

// NewClient creates a new queue Client connected to the given Redis address.
func NewClient(redisAddr string) *Client {
	return &Client{
		client: asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr}),
	}
}

// EnqueueTranscription enqueues a transcription job with 3 retries.
// Returns the task ID on success.
func (c *Client) EnqueueTranscription(meetingID, filePath string) error {
	payload, err := json.Marshal(TranscriptionPayload{
		MeetingID: meetingID,
		FilePath:  filePath,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal TranscriptionPayload: %w", err)
	}

	task := asynq.NewTask(TypeTranscriptionJob, payload,
		asynq.MaxRetry(3),
		asynq.Queue(QueueTranscription),
		asynq.TaskID("transcription:"+meetingID), // idempotency key
	)

	info, err := c.client.Enqueue(task)
	if err != nil {
		logger.L.Error("failed to enqueue transcription job",
			zap.String("meeting_id", meetingID),
			zap.Error(err),
		)
		return fmt.Errorf("enqueue transcription failed: %w", err)
	}

	logger.L.Info("enqueued transcription job",
		zap.String("job_id", info.ID),
		zap.String("meeting_id", meetingID),
		zap.String("queue", info.Queue),
	)
	return nil
}

// EnqueueBotJoin enqueues a bot join job with highest priority and 3 retries.
func (c *Client) EnqueueBotJoin(meetingID, meetingURL, userID string) error {
	payload, err := json.Marshal(BotJoinPayload{
		MeetingID:  meetingID,
		MeetingURL: meetingURL,
		UserID:     userID,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal BotJoinPayload: %w", err)
	}

	task := asynq.NewTask(TypeBotJoinJob, payload,
		asynq.MaxRetry(3),
		asynq.Queue(QueueBot),
		asynq.TaskID("bot:"+meetingID),
	)

	info, err := c.client.Enqueue(task)
	if err != nil {
		logger.L.Error("failed to enqueue bot join job",
			zap.String("meeting_id", meetingID),
			zap.Error(err),
		)
		return fmt.Errorf("enqueue bot join failed: %w", err)
	}

	logger.L.Info("enqueued bot join job",
		zap.String("job_id", info.ID),
		zap.String("meeting_id", meetingID),
		zap.String("queue", info.Queue),
	)
	return nil
}

// EnqueueAISummary enqueues an AI summarisation job with 3 retries.
func (c *Client) EnqueueAISummary(meetingID string) error {
	payload, err := json.Marshal(AISummaryPayload{MeetingID: meetingID})
	if err != nil {
		return fmt.Errorf("failed to marshal AISummaryPayload: %w", err)
	}

	task := asynq.NewTask(TypeAISummaryJob, payload,
		asynq.MaxRetry(3),
		asynq.Queue(QueueAI),
		asynq.TaskID("ai:"+meetingID),
	)

	info, err := c.client.Enqueue(task)
	if err != nil {
		logger.L.Error("failed to enqueue AI summary job",
			zap.String("meeting_id", meetingID),
			zap.Error(err),
		)
		return fmt.Errorf("enqueue AI summary failed: %w", err)
	}

	logger.L.Info("enqueued AI summary job",
		zap.String("job_id", info.ID),
		zap.String("meeting_id", meetingID),
		zap.String("queue", info.Queue),
	)
	return nil
}

// EnqueueEmbed dispatches a job to chunk and vectorize meeting transcripts.
func (c *Client) EnqueueEmbed(meetingID string) error {
	payload, err := json.Marshal(AISummaryPayload{MeetingID: meetingID})
	if err != nil {
		return err
	}
	task := asynq.NewTask(
		TypeEmbedJob,
		payload,
		asynq.MaxRetry(3),
		asynq.Queue(QueueAI),
		asynq.TaskID("embed:"+meetingID),
	)

	info, err := c.client.Enqueue(task)
	if err != nil {
		logger.L.Error("failed to enqueue memory embed job", zap.String("meeting_id", meetingID), zap.Error(err))
		return err
	}

	logger.L.Info("enqueued memory embed job", zap.String("job_id", info.ID), zap.String("meeting_id", meetingID))
	return nil
}

// Close closes the underlying Asynq client connection.
func (c *Client) Close() {
	c.client.Close()
}
