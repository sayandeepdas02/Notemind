package main

import (
	"net/http"
	"time"

	"notemind/internal/ai"
	"notemind/internal/api"
	"notemind/internal/auth"
	"notemind/internal/automation"
	"notemind/internal/db"
	"notemind/internal/health"
	"notemind/internal/meeting"
	"notemind/internal/memory"
	"notemind/internal/organization"
	"notemind/internal/provider"
	"notemind/internal/workspace"
	googlemeetprovider "notemind/internal/provider/googlemeet"
	zoom "notemind/internal/provider/zoom"
	"notemind/internal/queue"
	"notemind/internal/share"
	"notemind/internal/vexa"
	"notemind/pkg/config"
	"notemind/pkg/logger"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)


func main() {
	// ── 1. Config — load and validate (fail fast if required vars missing) ────
	cfg := config.LoadConfig()
	cfg.Validate()

	// ── 2. Logger — must be initialised before anything else uses it ──────────
	if err := logger.Init(cfg.AppEnv); err != nil {
		panic("failed to initialise logger: " + err.Error())
	}
	defer logger.Sync()

	logger.L.Info("Notemind API starting",
		zap.String("env", cfg.AppEnv),
		zap.String("port", cfg.Port),
		zap.String("dsn", cfg.DSNRedacted()),
		zap.String("redis", cfg.RedisAddr),
	)

	// ── 3. Database — connect + run migrations ────────────────────────────────
	if err := db.InitDB(cfg.DatabaseDSN); err != nil {
		logger.L.Fatal("failed to initialise database", zap.Error(err))
	}

	// ── 4. JWT secret ─────────────────────────────────────────────────────────
	auth.JWTSecret = []byte(cfg.JWTSecret)

	// ── 4. Queue — Redis-backed Asynq client ──────────────────────────────────
	queueClient := queue.NewClient(cfg.RedisAddr)
	defer queueClient.Close()

	// ── 5. Vexa client + Provider Registry ────────────────────────────────────
	vexaClient := vexa.NewClient(cfg.VexaAPIBase, cfg.VexaAPIKey)
	if cfg.VexaAPIKey == "" {
		logger.L.Warn("VEXA_API_KEY not set — live meeting join will fail")
	} else {
		logger.L.Info("Vexa client configured", zap.String("base_url", cfg.VexaAPIBase))
	}

	// Build provider registry — providers are matched in registration order
	providerRegistry := provider.NewRegistry()
	providerRegistry.Register(googlemeetprovider.New(vexaClient))

	zoomTokenStore := zoom.NewDBTokenStore()
	zoomOAuthSvc := zoom.NewOAuthService(zoom.OAuthConfig{
		ClientID:     cfg.ZoomClientID,
		ClientSecret: cfg.ZoomClientSecret,
		RedirectURI:  cfg.ZoomRedirectURI,
	}, zoomTokenStore)
	providerRegistry.Register(zoom.New(vexaClient, zoomTokenStore))

	zoomOAuthHandler := zoom.NewOAuthHandler(zoomOAuthSvc)

	// ── 6. SSE Hub — real-time transcript fan-out ─────────────────────────────
	hub := meeting.NewHub()

	// ── 7. Redis Cache Client ─────────────────────────────────────────────────
	redisOpts, err := redis.ParseURL(cfg.RedisAddr)
	if err != nil {
		// Fallback if it's not a full URL
		redisOpts = &redis.Options{Addr: cfg.RedisAddr}
	}
	redisClient := redis.NewClient(redisOpts)
	defer redisClient.Close()

	// ── 8. AI Pipeline ────────────────────────────────────────────────────────
	aiPipeline := ai.NewPipeline(cfg, redisClient)

	// ── 9. Domain layer ───────────────────────────────────────────────────────
	repo := meeting.NewRepository()
	service := meeting.NewService(repo, queueClient, hub, aiPipeline, providerRegistry)
	handler := meeting.NewHandler(service, hub)

	authService := auth.NewService()
	authHandler := auth.NewHandler(authService)
	shareHandler := share.NewHandler()

	orgRepo := organization.NewRepository()
	orgHandler := organization.NewHandler(orgRepo)

	autoRepo := automation.NewRepository()
	autoEngine := automation.NewEngine(autoRepo)
	autoHandler := automation.NewHandler(autoEngine, autoRepo)

	// Memory / AI
	memoryRepo := memory.NewRepository()
	embedder := memory.NewOpenAIEmbedder(cfg.OpenAIAPIKey, cfg.EmbeddingModel)
	llmClient := memory.NewOpenAILLM(cfg.OpenAIAPIKey, "gpt-4o") // Hardcoded GPT-4o for now
	searchSvc := memory.NewSearchService(memoryRepo, embedder)
	ragEngine := memory.NewRAGEngine(embedder, memoryRepo, llmClient)
	memoryHandler := memory.NewHandler(searchSvc, ragEngine, memoryRepo)

	// Workspaces (Phase 4)
	workspaceSvc := workspace.NewService()
	workspaceHandler := workspace.NewHandler(workspaceSvc)

	// ── 9. HTTP server ────────────────────────────────────────────────────────
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery()) // recover from panics without crashing the process
	r.Use(api.CorrelationIDMiddleware())
	r.Use(api.RequestLogger())

	// Start Prometheus metrics endpoint on port 9090
	go func() {
		http.Handle("/metrics", promhttp.Handler())
		logger.L.Info("Prometheus metrics server listening on :9090")
		if err := http.ListenAndServe(":9090", nil); err != nil {
			logger.L.Error("Prometheus server failed", zap.Error(err))
		}
	}()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Cache-Control"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
	}))

	// Health check (unauthenticated)
	r.GET("/health", health.NewHandler(cfg.RedisAddr))

	// Zoom OAuth
	r.GET("/auth/zoom", func(c *gin.Context) {
		_ = zoomOAuthHandler
		state := c.Query("state")
		if state == "" {
			state = "notemind"
		}
		c.Redirect(302, zoomOAuthSvc.AuthorizationURL(state))
	})
	r.GET("/auth/zoom/callback", func(c *gin.Context) {
		userID := c.GetString("user_id") // populated by middleware if token present
		code := c.Query("code")
		if code == "" {
			c.JSON(400, gin.H{"error": "missing code"})
			return
		}
		_, err := zoomOAuthSvc.ExchangeCode(c.Request.Context(), userID, code)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "zoom connected"})
	})

	// Auth
	r.POST("/auth/google", authHandler.GoogleLogin)

	// Public share
	r.GET("/share/:token", shareHandler.GetSharedIntelligence)

	// Authenticated meeting routes
	meetings := r.Group("/meetings")
	meetings.Use(auth.Middleware())
	{
		// Phase 2 — live join via Vexa (Rate Limited)
		meetings.POST("/join", api.RateLimitMiddleware(redisClient, 5, time.Minute), handler.JoinMeeting)
		meetings.DELETE("/:id/bot", handler.StopMeeting)

		// Phase 1 — file upload pipeline
		meetings.POST("/upload", handler.UploadAudio)

		// Read APIs
		meetings.GET("", handler.GetMeetings)
		meetings.GET("/:id", handler.GetMeeting)
		meetings.GET("/:id/transcripts", handler.GetTranscripts)
		meetings.GET("/:id/transcript", handler.GetTranscript)
		meetings.GET("/:id/summary", handler.GetSummary)

		// SSE real-time stream
		meetings.GET("/:id/stream", handler.StreamTranscripts)

		// Share
		meetings.POST("/:id/share", shareHandler.CreateShare)

		// Tags on meetings
		meetings.POST("/:id/tags", orgHandler.AddTagToMeeting)
		meetings.DELETE("/:id/tags/:tagId", orgHandler.RemoveTagFromMeeting)
	}

	// Folders
	folders := r.Group("/folders").Use(auth.Middleware())
	{
		folders.GET("", orgHandler.ListFolders)
		folders.POST("", orgHandler.CreateFolder)
		folders.PUT("/:id", orgHandler.UpdateFolder)
		folders.DELETE("/:id", orgHandler.DeleteFolder)
		folders.POST("/:id/meetings", orgHandler.AddMeetingToFolder)
		folders.DELETE("/:id/meetings/:meetingId", orgHandler.RemoveMeetingFromFolder)
	}

	// Tags
	tagsG := r.Group("/tags").Use(auth.Middleware())
	{
		tagsG.GET("", orgHandler.ListTags)
		tagsG.POST("", orgHandler.CreateTag)
		tagsG.DELETE("/:id", orgHandler.DeleteTag)
	}

	// Search
	r.GET("/search", auth.Middleware(), orgHandler.Search)

	// Automation rules
	autoG := r.Group("/automation").Use(auth.Middleware())
	{
		autoG.GET("/rules", autoHandler.ListRules)
		autoG.POST("/rules", autoHandler.CreateRule)
		autoG.PUT("/rules/:id", autoHandler.UpdateRule)
		autoG.DELETE("/rules/:id", autoHandler.DeleteRule)
	}

	// Memory AI
	memoryG := r.Group("/memory").Use(auth.Middleware())
	{
		memoryG.GET("/search", memoryHandler.Search)
		memoryG.GET("/ask", memoryHandler.Ask)
		memoryG.GET("/chat/history", memoryHandler.GetHistory)
	}

	// Workspaces (Phase 4)
	workspaceG := r.Group("/workspaces").Use(auth.Middleware())
	{
		workspaceG.GET("", workspaceHandler.List)
		workspaceG.POST("", workspaceHandler.Create)
		// No middleware yet to avoid cyclic dependency for now, we'll apply it at the handler level or separate package
		workspaceG.GET("/:workspace_id/members", workspaceHandler.ListMembers)
		workspaceG.POST("/:workspace_id/members", workspaceHandler.AddMember)
	}

	logger.L.Info("API server listening", zap.String("port", cfg.Port))
	if err := r.Run(":" + cfg.Port); err != nil {
		logger.L.Fatal("API server failed", zap.Error(err))
	}
}
