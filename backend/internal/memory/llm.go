package memory

import (
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/sashabaranov/go-openai"
)

// LLMClient represents a chat-based LLM.
type LLMClient interface {
	// StreamChat sends messages and streams the response back via a channel.
	StreamChat(ctx context.Context, messages []openai.ChatCompletionMessage) (<-chan string, error)
	// Complete sends messages and returns the full response at once.
	Complete(ctx context.Context, messages []openai.ChatCompletionMessage) (string, error)
	Model() string
}

type OpenAILLM struct {
	client *openai.Client
	model  string
}

func NewOpenAILLM(apiKey, model string) *OpenAILLM {
	if model == "" {
		model = openai.GPT4o
	}
	return &OpenAILLM{
		client: openai.NewClient(apiKey),
		model:  model,
	}
}

func (o *OpenAILLM) Model() string {
	return o.model
}

func (o *OpenAILLM) Complete(ctx context.Context, messages []openai.ChatCompletionMessage) (string, error) {
	req := openai.ChatCompletionRequest{
		Model:       o.model,
		Messages:    messages,
		Temperature: 0.3, // Lower temperature for more factual responses
	}

	resp, err := o.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return "", fmt.Errorf("openai chat completion failed: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("openai returned no choices")
	}

	return resp.Choices[0].Message.Content, nil
}

func (o *OpenAILLM) StreamChat(ctx context.Context, messages []openai.ChatCompletionMessage) (<-chan string, error) {
	req := openai.ChatCompletionRequest{
		Model:       o.model,
		Messages:    messages,
		Temperature: 0.3,
		Stream:      true,
	}

	stream, err := o.client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("openai stream creation failed: %w", err)
	}

	ch := make(chan string)

	go func() {
		defer stream.Close()
		defer close(ch)

		for {
			select {
			case <-ctx.Done():
				return
			default:
				resp, err := stream.Recv()
				if errors.Is(err, io.EOF) {
					return
				}
				if err != nil {
					// Optionally send an error marker over the channel
					ch <- fmt.Sprintf("\n[Error: %v]", err)
					return
				}
				if len(resp.Choices) > 0 {
					ch <- resp.Choices[0].Delta.Content
				}
			}
		}
	}()

	return ch, nil
}
