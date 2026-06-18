package billing

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/stripe/stripe-go/v78"
	checkoutsession "github.com/stripe/stripe-go/v78/checkout/session"
	"github.com/stripe/stripe-go/v78/customer"
	portalsession "github.com/stripe/stripe-go/v78/billingportal/session"
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

// GetOrCreateCustomer returns the Stripe customer ID for a workspace, creating one if needed.
func (s *StripeService) GetOrCreateCustomer(ctx context.Context, workspaceID, userEmail string) (string, error) {
	var customerID string
	err := db.DB.QueryRowContext(ctx, `
		SELECT COALESCE(stripe_customer_id, '') FROM workspace_billing WHERE workspace_id = $1
	`, workspaceID).Scan(&customerID)
	if err != nil && err != sql.ErrNoRows {
		return "", fmt.Errorf("lookup stripe customer: %w", err)
	}
	if customerID != "" {
		return customerID, nil
	}

	params := &stripe.CustomerParams{Email: stripe.String(userEmail)}
	params.AddMetadata("workspace_id", workspaceID)
	cust, err := customer.New(params)
	if err != nil {
		return "", fmt.Errorf("create stripe customer: %w", err)
	}

	_, err = db.DB.ExecContext(ctx, `
		INSERT INTO workspace_billing (workspace_id, stripe_customer_id, plan_id, status)
		VALUES ($1, $2, 'free', 'active')
		ON CONFLICT (workspace_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id, updated_at = NOW()
	`, workspaceID, cust.ID)
	if err != nil {
		return "", fmt.Errorf("save stripe customer: %w", err)
	}
	return cust.ID, nil
}

// CreateCheckoutSession creates a Stripe Checkout session for the given workspace and price.
func (s *StripeService) CreateCheckoutSession(ctx context.Context, workspaceID, userEmail, priceID, successURL, cancelURL string) (string, error) {
	customerID, err := s.GetOrCreateCustomer(ctx, workspaceID, userEmail)
	if err != nil {
		return "", err
	}

	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
	}
	params.AddMetadata("workspace_id", workspaceID)

	sess, err := checkoutsession.New(params)
	if err != nil {
		return "", fmt.Errorf("create checkout session: %w", err)
	}
	return sess.URL, nil
}

// CreatePortalSession creates a Stripe Billing Portal session for managing the workspace subscription.
func (s *StripeService) CreatePortalSession(ctx context.Context, workspaceID, returnURL string) (string, error) {
	var customerID string
	err := db.DB.QueryRowContext(ctx, `
		SELECT COALESCE(stripe_customer_id, '') FROM workspace_billing WHERE workspace_id = $1
	`, workspaceID).Scan(&customerID)
	if err == sql.ErrNoRows || customerID == "" {
		return "", fmt.Errorf("no billing account found for workspace %s", workspaceID)
	}
	if err != nil {
		return "", fmt.Errorf("lookup stripe customer: %w", err)
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnURL),
	}
	sess, err := portalsession.New(params)
	if err != nil {
		return "", fmt.Errorf("create portal session: %w", err)
	}
	return sess.URL, nil
}
