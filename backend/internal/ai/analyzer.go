package ai

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"

	"notemind/internal/ai/prompts"
	"notemind/pkg/config"
	"notemind/pkg/logger"
)

// Pipeline orchestrates the chunk-and-aggregate process.
type Pipeline struct {
	router    *Router
	redis     *redis.Client
	prompts   *prompts.Registry
}

func NewPipeline(cfg *config.Config, redisClient *redis.Client) *Pipeline {
	return &Pipeline{
		router:  NewRouter(cfg),
		redis:   redisClient,
		prompts: prompts.NewRegistry(),
	}
}

// Run executes the multi-stage AI summary pipeline.
func (p *Pipeline) Run(ctx context.Context, segments []RawSegment, meetingType prompts.MeetingType) (*MeetingSummary, error) {
	if p.router == nil {
		return nil, fmt.Errorf("AI pipeline not initialized (no router)")
	}

	if len(segments) == 0 {
		return nil, fmt.Errorf("no transcript segments to analyze")
	}

	logger.L.Info("AI pipeline: chunking segments", zap.Int("segment_count", len(segments)))
	chunks := CleanAndChunk(segments)
	logger.L.Info("AI pipeline: chunks ready", zap.Int("chunk_count", len(chunks)))

	if len(chunks) == 0 {
		return nil, fmt.Errorf("no meaningful content to analyze after cleaning")
	}

	// 1. Process chunks concurrently
	chunkResults := make([]*ChunkAnalysis, len(chunks))
	var wg sync.WaitGroup
	var mu sync.Mutex // protects error tracking if we want to add it

	for i, chunk := range chunks {
		wg.Add(1)
		go func(idx int, c TranscriptChunk) {
			defer wg.Done()
			
			// Generate deterministic cache key
			hash := sha256.Sum256([]byte(chunk.Content))
			cacheKey := fmt.Sprintf("ai:chunk:%s", hex.EncodeToString(hash[:]))

			var res *ChunkAnalysis
			var err error

			// 1. Try Cache
			cached, redisErr := p.redis.Get(ctx, cacheKey).Result()
			if redisErr == nil && cached != "" {
				var cachedRes ChunkAnalysis
				if jsonErr := json.Unmarshal([]byte(cached), &cachedRes); jsonErr == nil {
					logger.L.Info("AI pipeline: cache hit for chunk", zap.Int("chunk_idx", idx))
					res = &cachedRes
				}
			}

			// 2. Cache miss — call OpenAI
			if res == nil {
				res, err = p.analyzeChunk(ctx, chunk, meetingType)
				if err != nil {
					logger.L.Error("AI pipeline: chunk analysis failed",
						zap.Int("chunk_idx", idx), zap.Error(err))
					return
				}

				// 3. Cache result
				if resBytes, jErr := json.Marshal(res); jErr == nil {
					p.redis.Set(ctx, cacheKey, resBytes, 7*24*time.Hour)
				}
			}
			
			mu.Lock()
			chunkResults[idx] = res
			mu.Unlock()
		}(i, chunk)
	}

	wg.Wait()

	// 2. Aggregate results
	logger.L.Info("AI pipeline: aggregating chunk results")
	var allKeyPoints []string
	var allDecisions []string
	var allActionItems []ActionItem

	for _, res := range chunkResults {
		if res == nil {
			continue
		}
		allKeyPoints = append(allKeyPoints, res.KeyPoints...)
		allDecisions = append(allDecisions, res.Decisions...)
		allActionItems = append(allActionItems, res.ActionItems...)
	}

	// 3. Final refinement pass
	finalSummary, err := p.aggregateAnalyses(ctx, chunks, allKeyPoints, allDecisions, allActionItems, meetingType)
	if err != nil {
		return nil, fmt.Errorf("failed to generate final aggregated summary: %w", err)
	}

	logger.L.Info("AI pipeline: successfully generated meeting intelligence")
	return finalSummary, nil
}

func (p *Pipeline) analyzeChunk(ctx context.Context, chunk TranscriptChunk, mt prompts.MeetingType) (*ChunkAnalysis, error) {
	promptSet := p.prompts.Get(mt)

	req := openai.ChatCompletionRequest{
		Model: p.router.RouteForChunking(),
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: promptSet.ChunkPrompt},
			{Role: openai.ChatMessageRoleUser, Content: fmt.Sprintf("CHUNK %d:\n\n%s", chunk.ChunkID, chunk.Content)},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
	}

	resp, err := p.router.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, err
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	var analysis ChunkAnalysis
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse chunk JSON: %w", err)
	}

	return &analysis, nil
}

func (p *Pipeline) aggregateAnalyses(ctx context.Context, chunks []TranscriptChunk, keyPoints, decisions []string, actionItems []ActionItem, mt prompts.MeetingType) (*MeetingSummary, error) {
	// Gather all unique speakers
	speakerSet := make(map[string]bool)
	for _, c := range chunks {
		for _, s := range c.Speakers {
			speakerSet[s] = true
		}
	}
	var participants []string
	for s := range speakerSet {
		participants = append(participants, s)
	}

	// Prepare payload of all extracted items
	payload := map[string]interface{}{
		"extracted_key_points":  keyPoints,
		"extracted_decisions":   decisions,
		"extracted_action_items": actionItems,
		"participants":          participants,
	}
	payloadBytes, _ := json.MarshalIndent(payload, "", "  ")

	promptSet := p.prompts.Get(mt)

	req := openai.ChatCompletionRequest{
		Model: p.router.RouteForAggregation(),
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: promptSet.AggregatePrompt},
			{Role: openai.ChatMessageRoleUser, Content: string(payloadBytes)},
		},
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
	}

	resp, err := p.router.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, err
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	var summary MeetingSummary
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &summary); err != nil {
		return nil, fmt.Errorf("failed to parse final summary JSON: %w", err)
	}

	return &summary, nil
}
