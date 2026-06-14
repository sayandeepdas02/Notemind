package billing

import (
	"database/sql"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// Handler exposes Stripe billing routes.
type Handler struct {
	svc         *StripeService
	frontendURL string
}

// NewHandler creates a billing Handler.
func NewHandler(svc *StripeService, frontendURL string) *Handler {
	return &Handler{svc: svc, frontendURL: frontendURL}
}

// POST /webhooks/stripe
// Public — Stripe sends events here. Verified by webhook signature.
func (h *Handler) HandleWebhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read body"})
		return
	}

	sig := c.GetHeader("Stripe-Signature")
	if err := h.svc.HandleWebhook(c.Request.Context(), payload, sig); err != nil {
		logger.L.Error("stripe webhook processing failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// GET /billing/status?workspace_id=<uuid>
// Protected — returns the persisted billing plan and status for the workspace.
func (h *Handler) GetStatus(c *gin.Context) {
	userID := c.GetString("user_id")
	workspaceID := c.Query("workspace_id")
	if workspaceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "workspace_id query parameter is required"})
		return
	}

	var isMember bool
	err := db.DB.QueryRowContext(c.Request.Context(), `
		SELECT EXISTS(SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2)
	`, workspaceID, userID).Scan(&isMember)
	if err != nil {
		logger.L.Error("billing status: membership check failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify workspace membership"})
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this workspace"})
		return
	}

	var plan, status string
	err = db.DB.QueryRowContext(c.Request.Context(), `
		SELECT plan_id, status FROM workspace_billing WHERE workspace_id = $1
	`, workspaceID).Scan(&plan, &status)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"plan": "free", "status": "active"})
		return
	}
	if err != nil {
		logger.L.Error("billing status: db query failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch billing status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"plan": plan, "status": status})
}

// POST /billing/checkout
// Protected — creates a Stripe Checkout session for the authenticated user.
func (h *Handler) CreateCheckout(c *gin.Context) {
	userID := c.GetString("user_id")

	var req struct {
		WorkspaceID string `json:"workspace_id" binding:"required"`
		PriceID     string `json:"price_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var isMember bool
	err := db.DB.QueryRowContext(c.Request.Context(), `
		SELECT EXISTS(SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2)
	`, req.WorkspaceID, userID).Scan(&isMember)
	if err != nil {
		logger.L.Error("checkout: membership check failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify workspace membership"})
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this workspace"})
		return
	}

	var userEmail string
	err = db.DB.QueryRowContext(c.Request.Context(), `SELECT email FROM users WHERE id = $1`, userID).Scan(&userEmail)
	if err != nil {
		logger.L.Error("checkout: user email lookup failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to look up user"})
		return
	}

	successURL := h.frontendURL + "/dashboard/billing?checkout=success"
	cancelURL := h.frontendURL + "/dashboard/billing?checkout=cancelled"

	url, err := h.svc.CreateCheckoutSession(c.Request.Context(), req.WorkspaceID, userEmail, req.PriceID, successURL, cancelURL)
	if err != nil {
		logger.L.Error("checkout: stripe session failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create checkout session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// POST /billing/portal
// Protected — creates a Stripe customer portal session for managing subscriptions.
func (h *Handler) CreatePortal(c *gin.Context) {
	userID := c.GetString("user_id")

	var req struct {
		WorkspaceID string `json:"workspace_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var isMember bool
	err := db.DB.QueryRowContext(c.Request.Context(), `
		SELECT EXISTS(SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2)
	`, req.WorkspaceID, userID).Scan(&isMember)
	if err != nil {
		logger.L.Error("portal: membership check failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify workspace membership"})
		return
	}
	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this workspace"})
		return
	}

	returnURL := h.frontendURL + "/dashboard/billing"
	url, err := h.svc.CreatePortalSession(c.Request.Context(), req.WorkspaceID, returnURL)
	if err != nil {
		logger.L.Error("portal: stripe session failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create portal session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}
