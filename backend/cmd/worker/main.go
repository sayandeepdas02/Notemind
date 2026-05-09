package main

import (
	"context"

	"notemind/internal/ai"
	"notemind/internal/db"
	"notemind/internal/meeting"
	"notemind/internal/memory"
	"notemind/internal/queue"
	"notemind/internal/vexa"
	"notemind/internal/worker"
	"notemind/pkg/config"
	"notemind/pkg/logger"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func main() {
	// ── 1. Config — load and validate (fail fast if required vars missing) ────
	cfg := config.LoadConfig()
	cfg.ValidateWorker()

	// ── 2. Logger ─────────────────────────────────────────────────────────────
	if err := logger.Init(cfg.AppEnv); err != nil {
		panic("failed to initialise logger: " + err.Error())
	}
	defer logger.Sync()

	logger.L.Info("Notemind Worker starting",
		zap.String("env", cfg.AppEnv),
		zap.String("redis", cfg.RedisAddr),
	)

	// ── 3. Database — connect + run migrations ────────────────────────────────
	if err := db.InitDB(cfg.DatabaseDSN); err != nil {
		logger.L.Fatal("failed to initialise database", zap.Error(err))
	}

	// ── 4. Redis Cache Client ─────────────────────────────────────────────────
	redisOpts, err := redis.ParseURL(cfg.RedisAddr)
	if err != nil {
		// Fallback if it's not a full URL
		redisOpts = &redis.Options{Addr: cfg.RedisAddr}
	}
	redisClient := redis.NewClient(redisOpts)
	defer redisClient.Close()

	// ── 5. Dependencies ───────────────────────────────────────────────────────
	repo := meeting.NewRepository()
	transcriber := ai.NewTranscriber(cfg)
	aiPipeline := ai.NewPipeline(cfg, redisClient)
	vexaClient := vexa.NewClient(cfg.VexaAPIBase, cfg.VexaAPIKey)
	hub := meeting.NewHub() // Worker needs hub for SSE status updates (bot handler)
	queueClient := queue.NewClient(cfg.RedisAddr)
	defer queueClient.Close()

	// Memory AI pipeline
	memoryRepo := memory.NewRepository()
	embedder := memory.NewOpenAIEmbedder(cfg.OpenAIAPIKey, cfg.EmbeddingModel)
	memoryPipeline := memory.NewPipeline(cfg, embedder, memoryRepo)

	// ── 5. Build all worker handlers ──────────────────────────────────────────
	workers := worker.NewWorkers(repo, transcriber, aiPipeline, vexaClient, hub, queueClient, memoryPipeline)

	// ── 6. Start Watchdog ─────────────────────────────────────────────────────
	wdog := worker.NewWatchdog(repo, queueClient)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go wdog.Start(ctx)

	// ── 7. Configure Asynq server with priority queues and error handler ──────
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.RedisAddr},
		asynq.Config{
			// Priority queues: bot (highest) → transcription → ai (lowest)
			Concurrency: 10,
			Queues: map[string]int{
				queue.QueueBot:           6,
				queue.QueueTranscription: 3,
				queue.QueueAI:            1,
			},
			// Use Asynq's default exponential backoff for retries
			RetryDelayFunc: asynq.DefaultRetryDelayFunc,
			// Error handler: log all failures with structured context.
			// After MaxRetry exhaustion, Asynq automatically archives the task (DLQ).
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				logger.L.Error("worker task failed permanently (archived to DLQ)",
					zap.String("task_type", task.Type()),
					zap.Error(err),
				)
			}),
		},
	)

	// ── 8. Register all handlers ──────────────────────────────────────────────
	mux := asynq.NewServeMux()
	workers.Register(mux)

	logger.L.Info("Worker listening for jobs",
		zap.Strings("queues", []string{queue.QueueBot, queue.QueueTranscription, queue.QueueAI}),
	)
	if err := srv.Run(mux); err != nil {
		logger.L.Fatal("Worker server failed", zap.Error(err))
	}
}
