// Package worker exposes the Workers compositor which wires all Asynq task handlers
// into a single registerable unit for cmd/worker/main.go.
package worker

import (
	"github.com/hibiken/asynq"

	"notemind/internal/ai"
	"notemind/internal/meeting"
	"notemind/internal/memory"
	"notemind/internal/notifications"
	"notemind/internal/queue"
	"notemind/internal/vexa"
)

// Workers holds all typed Asynq handler instances.
// Construct it with NewWorkers and register its handlers with an asynq.ServeMux.
type Workers struct {
	Transcription *TranscriptionHandler
	AI            *AIHandler
	Bot           *BotHandler
	Embed         asynq.HandlerFunc
}

// NewWorkers constructs all job handlers from the shared dependencies.
func NewWorkers(
	repo *meeting.Repository,
	transcriber *ai.Transcriber,
	aiPipeline *ai.Pipeline,
	vexaClient *vexa.Client,
	hub *meeting.Hub,
	queueClient *queue.Client,
	memoryPipeline *memory.Pipeline,
	emailSvc *notifications.EmailService, // nil when RESEND_API_KEY not set
) *Workers {
	return &Workers{
		Transcription: NewTranscriptionHandler(repo, transcriber, queueClient),
		AI:            NewAIHandler(repo, aiPipeline, queueClient, emailSvc),
		Bot:           NewBotHandler(repo, vexaClient, hub),
		Embed:         HandleEmbedJob(memoryPipeline, repo),
	}
}

// Register binds all handlers to the given ServeMux.
func (w *Workers) Register(mux *asynq.ServeMux) {
	mux.HandleFunc(queue.TypeTranscriptionJob, w.Transcription.Handle)
	mux.HandleFunc(queue.TypeAISummaryJob, w.AI.Handle)
	mux.HandleFunc(queue.TypeBotJoinJob, w.Bot.Handle)
	mux.HandleFunc(queue.TypeEmbedJob, w.Embed)
}
