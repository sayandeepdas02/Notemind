package ai

import (
	"context"
	"fmt"

	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"

	"notemind/pkg/config"
	"notemind/pkg/logger"
)

type Transcriber struct {
	client *openai.Client
}

func NewTranscriber(cfg *config.Config) *Transcriber {
	// If the key is empty, the client will still initialize but API calls will fail.
	return &Transcriber{
		client: openai.NewClient(cfg.OpenAIAPIKey),
	}
}

func (t *Transcriber) TranscribeAudio(ctx context.Context, filePath string) (string, error) {
	if t.client == nil {
		return "", fmt.Errorf("transcriber client not initialized")
	}

	logger.L.Info("sending audio to Whisper API", zap.String("file_path", filePath))

	req := openai.AudioRequest{
		Model:    openai.Whisper1,
		FilePath: filePath,
	}

	resp, err := t.client.CreateTranscription(ctx, req)
	if err != nil {
		return "", fmt.Errorf("failed to transcribe audio via Whisper API: %w", err)
	}

	return resp.Text, nil
}

func (t *Transcriber) GenerateSummary(ctx context.Context, transcriptText string) (string, error) {
	if t.client == nil {
		return "", fmt.Errorf("transcriber client not initialized")
	}

	logger.L.Info("generating summary via OpenAI")

	req := openai.ChatCompletionRequest{
		Model: openai.GPT3Dot5Turbo,
		Messages: []openai.ChatCompletionMessage{
			{
				Role: openai.ChatMessageRoleSystem,
				Content: `You are an AI assistant that summarizes meeting transcripts. 
You must return a raw JSON object with this exact structure: 
{
  "overview": "A short summary of the meeting",
  "key_points": ["point 1", "point 2"],
  "action_items": ["action 1", "action 2"]
}`,
			},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: transcriptText,
			},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
	}

	resp, err := t.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return "", fmt.Errorf("failed to generate summary via OpenAI: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response choices returned from OpenAI")
	}

	return resp.Choices[0].Message.Content, nil
}
