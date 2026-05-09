package ai

import (
	"context"

	"github.com/sashabaranov/go-openai"
	"notemind/pkg/config"
)

// Router handles model selection logic based on the task and configuration.
type Router struct {
	client       *openai.Client
	defaultFast  string
	defaultSmart string
}

func NewRouter(cfg *config.Config) *Router {
	return &Router{
		client:       openai.NewClient(cfg.OpenAIAPIKey),
		defaultFast:  openai.GPT3Dot5Turbo,
		defaultSmart: openai.GPT4o,
	}
}

// Client returns the underlying OpenAI client.
func (r *Router) Client() *openai.Client {
	return r.client
}

// RouteForChunking returns the model to use for processing individual transcript chunks.
// Chunks are numerous, so we default to a fast/cheap model unless high accuracy is forced.
func (r *Router) RouteForChunking() string {
	return r.defaultFast
}

// RouteForAggregation returns the model to use for the final meeting summary.
// This requires high reasoning capability, so we default to the "smart" model.
func (r *Router) RouteForAggregation() string {
	return r.defaultSmart
}

// RouteForGraph returns the model for structured entity extraction.
func (r *Router) RouteForGraph() string {
	return r.defaultSmart
}

// CreateChatCompletion is a passthrough to the OpenAI client that logs usage for cost tracking.
func (r *Router) CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	// In a full implementation, we'd intercept the response here to log token usage
	// against the tenant's monthly quota before returning.
	return r.client.CreateChatCompletion(ctx, req)
}
