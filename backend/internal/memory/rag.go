package memory

import (
	"context"
	"fmt"
	"strings"

	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"

	"notemind/internal/workspace"
	"notemind/pkg/logger"
)

// RAGEngine handles conversational queries using Retrieval-Augmented Generation.
type RAGEngine struct {
	embedder  Embedder
	repo      *Repository
	llmClient LLMClient
}

// NewRAGEngine creates a new RAGEngine.
func NewRAGEngine(embedder Embedder, repo *Repository, llmClient LLMClient) *RAGEngine {
	return &RAGEngine{
		embedder:  embedder,
		repo:      repo,
		llmClient: llmClient,
	}
}

// Ask queries the memory layer and streams an answer back.
// Returns a channel for the streamed response, the citations used, and any initial error.
func (r *RAGEngine) Ask(ctx context.Context, userID, question string, filters SearchFilters, sessionID string) (<-chan string, []Citation, error) {
	workspaceID, err := workspace.GetDefaultWorkspaceID(ctx, userID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to resolve workspace: %w", err)
	}

	log := logger.With(zap.String("workspace_id", workspaceID), zap.String("session_id", sessionID))

	// 1. Retrieve context chunks
	embeddings, err := r.embedder.Embed(ctx, []string{question})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to embed question: %w", err)
	}

	// Retrieve top 8 most relevant chunks
	results, err := r.repo.SimilaritySearch(ctx, userID, embeddings[0], 8, filters)
	if err != nil {
		return nil, nil, fmt.Errorf("similarity search failed: %w", err)
	}

	var citations []Citation
	var contextBuilder strings.Builder

	for i, res := range results {
		// Build context string
		contextBuilder.WriteString(fmt.Sprintf("\n--- Source [%d] ---\n", i+1))
		contextBuilder.WriteString(fmt.Sprintf("Meeting: %s\n", res.MeetingID))
		contextBuilder.WriteString(fmt.Sprintf("Time: %s\n", res.Chunk.StartTime.Format("15:04:05")))
		contextBuilder.WriteString(fmt.Sprintf("Speaker: %s\n", res.Chunk.Speaker))
		contextBuilder.WriteString(fmt.Sprintf("Transcript: %s\n", res.Chunk.Content))

		// Build citation metadata
		citations = append(citations, Citation{
			MeetingID: res.MeetingID,
			StartTime: res.Chunk.StartTime.Format("15:04:05"),
			Speaker:   res.Chunk.Speaker,
			Text:      res.Chunk.Content,
			Score:     res.Score,
		})
	}

	systemPrompt := `You are Notemind AI, a helpful organizational memory assistant.
Answer the user's question using ONLY the context provided below. 
If the context does not contain the answer, politely say that you don't know based on the available meeting transcripts.
Always cite your sources where applicable by referencing the Source numbers (e.g. [1], [2]).

CONTEXT:
` + contextBuilder.String()

	// Optionally fetch past chat history for this session here
	// messages := r.repo.GetChatHistory(sessionID)
	// For now, we'll just do a single turn.

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
		{Role: openai.ChatMessageRoleUser, Content: question},
	}

	log.Info("streaming RAG response", zap.Int("citations", len(citations)))

	// Start streaming
	streamCh, err := r.llmClient.StreamChat(ctx, messages)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to start stream: %w", err)
	}

	// We intercept the stream to capture the full assistant response and save it to the DB asynchronously
	outCh := make(chan string)
	go func() {
		defer close(outCh)
		var fullResponse strings.Builder
		for token := range streamCh {
			outCh <- token
			fullResponse.WriteString(token)
		}

		// Save the exchange to DB
		msg := ChatMessage{
			WorkspaceID: workspaceID,
			SessionID:   sessionID,
			Role:        "assistant",
			Content:     fullResponse.String(),
			Citations:   citations,
			Model:       r.llmClient.Model(),
		}
		if filters.MeetingID != "" {
			msg.MeetingID = &filters.MeetingID
		}

		// We do an async fire-and-forget save
		go r.saveChatExchange(workspaceID, sessionID, question, msg)
	}()

	return outCh, citations, nil
}

func (r *RAGEngine) saveChatExchange(workspaceID, sessionID, question string, assistantMsg ChatMessage) {
	ctx := context.Background() // new disconnected context for async save

	// Save User message
	userMsg := ChatMessage{
		WorkspaceID: workspaceID,
		SessionID:   sessionID,
		Role:        "user",
		Content:     question,
		MeetingID:   assistantMsg.MeetingID,
	}
	_ = r.repo.SaveChatMessage(ctx, userMsg)

	// Save Assistant message
	_ = r.repo.SaveChatMessage(ctx, assistantMsg)
}
