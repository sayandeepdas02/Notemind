package memory

import (
	"context"
	"fmt"
	"strings"

	"github.com/sashabaranov/go-openai"
)

// Embedder generates vector embeddings for text.
type Embedder interface {
	Embed(ctx context.Context, texts []string) ([][]float32, error)
	Model() string
	Dimensions() int
}

// OpenAIEmbedder implements Embedder using OpenAI's embedding API.
type OpenAIEmbedder struct {
	client *openai.Client
	model  string
}

// NewOpenAIEmbedder creates a new OpenAIEmbedder.
func NewOpenAIEmbedder(apiKey, model string) *OpenAIEmbedder {
	if model == "" {
		model = "text-embedding-3-small"
	}
	return &OpenAIEmbedder{
		client: openai.NewClient(apiKey),
		model:  model,
	}
}

// Embed generates embeddings for a batch of texts.
func (e *OpenAIEmbedder) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	// Clean inputs: replace newlines with spaces (best practice for OpenAI embeddings)
	cleanTexts := make([]string, len(texts))
	for i, t := range texts {
		cleanTexts[i] = strings.ReplaceAll(t, "\n", " ")
	}

	req := openai.EmbeddingRequest{
		Input: cleanTexts,
		Model: openai.EmbeddingModel(e.model),
	}

	resp, err := e.client.CreateEmbeddings(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("openai embedding failed: %w", err)
	}

	if len(resp.Data) != len(texts) {
		return nil, fmt.Errorf("expected %d embeddings, got %d", len(texts), len(resp.Data))
	}

	embeddings := make([][]float32, len(resp.Data))
	for i, data := range resp.Data {
		embeddings[i] = data.Embedding
	}

	return embeddings, nil
}

// Model returns the name of the model being used.
func (e *OpenAIEmbedder) Model() string {
	return e.model
}

// Dimensions returns the expected output vector size.
func (e *OpenAIEmbedder) Dimensions() int {
	if strings.Contains(e.model, "large") {
		return 3072
	}
	return 1536
}
