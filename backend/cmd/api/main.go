package main

import (
	"net/http"
	"strings"
	"time"

	"notemind/internal/ai"
	"notemind/internal/api"
	apikeys "notemind/internal/api/keys"
	wsmiddleware "notemind/internal/api/middleware"
	"notemind/internal/auth"
	"notemind/internal/automation"
	"notemind/internal/billing"
	"notemind/internal/calendar"
	"notemind/internal/db"
	"notemind/internal/health"
	"notemind/internal/meeting"
	"notemind/internal/memory"
	"notemind/internal/notifications"
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

	// API Keys
	apiKeySvc := apikeys.NewService()
	apiKeyHandler := apikeys.NewHandler(apiKeySvc)
	// Wire API key validator into auth middleware for nm_xxx token support
	auth.GlobalKeyValidator = apiKeySvc

	emailSvc := notifications.NewEmailService(cfg.ResendAPIKey, cfg.EmailFrom, cfg.FrontendURL)
	if cfg.ResendAPIKey == "" {
		logger.L.Warn("RESEND_API_KEY not set — magic-link emails will be logged instead of sent")
	}

	authService := auth.NewService()
	authHandler := auth.NewHandler(authService, redisClient, cfg, emailSvc)
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

	// Google Calendar
	calSyncSvc := calendar.NewSyncService(calendar.NewRepository(), calendar.GoogleConfig{
		ClientID:     cfg.GoogleCalClientID,
		ClientSecret: cfg.GoogleCalClientSecret,
		RedirectURI:  cfg.GoogleCalRedirectURI,
	})
	calHandler := calendar.NewHandler(calSyncSvc, cfg.FrontendURL)
	if cfg.GoogleCalClientID == "" {
		logger.L.Warn("GOOGLE_CAL_CLIENT_ID not set — Google Calendar OAuth will fail")
	}

	// Stripe Billing
	var billingHandler *billing.Handler
	if cfg.StripeSecretKey != "" {
		stripeSvc := billing.NewStripeService(cfg.StripeSecretKey, cfg.StripeWebhookSecret)
		billingHandler = billing.NewHandler(stripeSvc, cfg.FrontendURL)
	} else {
		logger.L.Warn("STRIPE_SECRET_KEY not set — billing endpoints disabled")
	}

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

	allowedOrigins := strings.Split(cfg.AllowedOrigins, ",")
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Cache-Control", "Last-Event-ID"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
	}))

	// Health check (unauthenticated)
	r.GET("/health", health.NewHandler(cfg.RedisAddr))

	// Zoom OAuth
	// POST /auth/zoom/initiate returns the Zoom consent URL as JSON so the browser
	// can authenticate via the Authorization header (fetch) and then navigate.
	// GET /auth/zoom is kept for non-browser API clients that can follow redirects
	// with an Authorization header (e.g. curl -L -H "Authorization: Bearer ...").
	r.POST("/auth/zoom/initiate", auth.Middleware(), func(c *gin.Context) {
		userID := c.GetString("user_id")
		stateToken, err := auth.GenerateToken(userID)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to generate state"})
			return
		}
		c.JSON(200, gin.H{"url": zoomOAuthSvc.AuthorizationURL(stateToken)})
	})
	r.GET("/auth/zoom", auth.Middleware(), func(c *gin.Context) {
		_ = zoomOAuthHandler
		userID := c.GetString("user_id")
		stateToken, err := auth.GenerateToken(userID)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to generate state"})
			return
		}
		c.Redirect(302, zoomOAuthSvc.AuthorizationURL(stateToken))
	})
	r.GET("/auth/zoom/callback", func(c *gin.Context) {
		stateToken := c.Query("state")
		userID, err := auth.ValidateToken(stateToken)
		if err != nil || userID == "" {
			c.JSON(400, gin.H{"error": "invalid or missing state"})
			return
		}
		code := c.Query("code")
		if code == "" {
			c.JSON(400, gin.H{"error": "missing code"})
			return
		}
		if _, err := zoomOAuthSvc.ExchangeCode(c.Request.Context(), userID, code); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.Redirect(302, cfg.FrontendURL+"/dashboard/settings?zoom=connected")
	})

	// Auth — real Google OAuth
	r.GET("/auth/google/initiate", authHandler.InitiateGoogleOAuth)
	r.GET("/auth/google/callback", authHandler.GoogleOAuthCallback)
	// Exchanges the one-time auth code (from OAuth redirect) for a JWT — public.
	r.POST("/auth/exchange", authHandler.ExchangeCode)
	// Issues a short-lived SSE stream token for browser EventSource clients.
	r.POST("/auth/stream-token", auth.Middleware(), authHandler.IssueStreamToken)
	// Dev-only fake login (blocked in production by handler guard)
	r.POST("/auth/google", authHandler.GoogleLogin)

	// Auth — email magic-link (passwordless)
	r.POST("/auth/email", authHandler.EmailAuth)
	r.GET("/auth/email/verify", authHandler.VerifyEmailToken)

	// User profile (authenticated)
	usersG := r.Group("/users").Use(auth.Middleware())
	{
		usersG.GET("/me", authHandler.GetMe)
		usersG.PUT("/me", authHandler.UpdateMe)
		usersG.DELETE("/me", authHandler.DeleteMe)
	}

	// Google Calendar OAuth
	r.GET("/auth/google-calendar", auth.Middleware(), calHandler.InitiateOAuth)
	r.GET("/auth/google-calendar/callback", calHandler.OAuthCallback)

	// Stripe webhook (public — signature verified inside handler)
	if billingHandler != nil {
		r.POST("/webhooks/stripe", billingHandler.HandleWebhook)
	}

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

	// SSE routes — use StreamTokenMiddleware so browsers can authenticate via
	// a short-lived ?stream_token= param (EventSource cannot set headers).
	sseAuth := auth.StreamTokenMiddleware(redisClient)
	r.GET("/meetings/:id/stream", sseAuth, handler.StreamTranscripts)

	// Memory AI
	memoryG := r.Group("/memory").Use(auth.Middleware())
	{
		memoryG.GET("/search", memoryHandler.Search)
		memoryG.GET("/chat/history", memoryHandler.GetHistory)
	}
	// /memory/ask is SSE — same stream-token auth as above.
	r.GET("/memory/ask", sseAuth, memoryHandler.Ask)

	// Workspaces (Phase 4)
	workspaceG := r.Group("/workspaces").Use(auth.Middleware())
	{
		workspaceG.GET("", workspaceHandler.List)
		workspaceG.POST("", workspaceHandler.Create)
		workspaceG.PUT("/:workspace_id",
			wsmiddleware.RequireWorkspaceRole(workspaceSvc, "admin"),
			workspaceHandler.Update,
		)
		workspaceG.GET("/:workspace_id/members",
			wsmiddleware.RequireWorkspaceRole(workspaceSvc, "member"),
			workspaceHandler.ListMembers,
		)
		workspaceG.POST("/:workspace_id/members",
			wsmiddleware.RequireWorkspaceRole(workspaceSvc, "admin"),
			workspaceHandler.AddMember,
		)
	}

	// Calendar (protected)
	calG := r.Group("/calendar").Use(auth.Middleware())
	{
		calG.POST("/sync", calHandler.SyncCalendar)
		calG.GET("/events", calHandler.ListEvents)
		calG.GET("/status", calHandler.GetStatus)
	}

	// Billing (protected)
	if billingHandler != nil {
		billingG := r.Group("/billing").Use(auth.Middleware())
		{
			billingG.GET("/status", billingHandler.GetStatus)
			billingG.POST("/checkout", billingHandler.CreateCheckout)
			billingG.POST("/portal", billingHandler.CreatePortal)
		}
	}

	// API Keys (protected)
	apiKeysG := r.Group("/api-keys").Use(auth.Middleware())
	{
		apiKeysG.GET("", apiKeyHandler.ListKeys)
		apiKeysG.POST("", apiKeyHandler.CreateKey)
		apiKeysG.PUT("/:id", apiKeyHandler.UpdateKey)
		apiKeysG.DELETE("/:id", apiKeyHandler.RevokeKey)
	}

	logger.L.Info("API server listening", zap.String("port", cfg.Port))
	if err := r.Run(":" + cfg.Port); err != nil {
		logger.L.Fatal("API server failed", zap.Error(err))
	}
}
