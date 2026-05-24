package billing

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

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

// GET /billing/status
// Protected — returns the current billing plan for the authenticated user's workspace.
func (h *Handler) GetStatus(c *gin.Context) {
	userID := c.GetString("user_id")

	// TODO: enforce plan limits — query workspace_billing for the user's active workspace
	_ = userID
	c.JSON(http.StatusOK, gin.H{"plan": "free", "status": "active"})
}

// POST /billing/checkout
// Protected — creates a Stripe Checkout session for the authenticated user.
func (h *Handler) CreateCheckout(c *gin.Context) {
	var req struct {
		WorkspaceID string `json:"workspace_id" binding:"required"`
		PriceID     string `json:"price_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: create Stripe checkout session via stripe.CheckoutSessions.New
	// Returning a placeholder until Stripe integration is wired per plan enforcement spec.
	c.JSON(http.StatusOK, gin.H{
		"url": h.frontendURL + "/dashboard/billing?checkout=pending",
	})
}

// POST /billing/portal
// Protected — creates a Stripe customer portal session for managing subscriptions.
func (h *Handler) CreatePortal(c *gin.Context) {
	var req struct {
		WorkspaceID string `json:"workspace_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: create Stripe billing portal session via stripe.BillingPortalSessions.New
	c.JSON(http.StatusOK, gin.H{
		"url": h.frontendURL + "/dashboard/billing",
	})
}
