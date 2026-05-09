package billing

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/webhook"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

type StripeService struct {
	secretKey     string
	webhookSecret string
}

func NewStripeService(secretKey, webhookSecret string) *StripeService {
	stripe.Key = secretKey
	return &StripeService{
		secretKey:     secretKey,
		webhookSecret: webhookSecret,
	}
}

// HandleWebhook processes incoming Stripe events.
func (s *StripeService) HandleWebhook(ctx context.Context, payload []byte, signature string) error {
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return err
	}

	switch event.Type {
	case "customer.subscription.updated", "customer.subscription.created", "customer.subscription.deleted":
		// stripe-go v78: unmarshal subscription from raw event data
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			return err
		}
		return s.handleSubscriptionChange(ctx, &sub)
	default:
		return nil
	}
}

func (s *StripeService) handleSubscriptionChange(ctx context.Context, sub *stripe.Subscription) error {
	var workspaceID string
	err := db.DB.QueryRowContext(ctx, `
		SELECT workspace_id FROM workspace_billing WHERE stripe_customer_id = $1
	`, sub.Customer.ID).Scan(&workspaceID)

	if err == sql.ErrNoRows {
		logger.L.Warn("received stripe sub update for unknown customer", zap.String("customer", sub.Customer.ID))
		return nil
	} else if err != nil {
		return err
	}

	planID := "free"
	if len(sub.Items.Data) > 0 {
		planID = sub.Items.Data[0].Price.Product.ID
	}

	status := string(sub.Status)

	_, err = db.DB.ExecContext(ctx, `
		UPDATE workspace_billing 
		SET stripe_subscription_id = $1, plan_id = $2, status = $3, updated_at = NOW()
		WHERE workspace_id = $4
	`, sub.ID, planID, status, workspaceID)

	if err != nil {
		return err
	}

	logger.L.Info("subscription updated", zap.String("workspace", workspaceID), zap.String("plan", planID))
	return nil
}
