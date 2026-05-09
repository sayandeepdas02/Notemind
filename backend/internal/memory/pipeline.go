package memory

import (
	"context"
	"fmt"

	"go.uber.org/zap"

	"notemind/internal/meeting"
	"notemind/pkg/config"
	"notemind/pkg/logger"
)

// Pipeline orchestrates the embedding process for a meeting.
type Pipeline struct {
	embedder Embedder
	repo     *Repository
	chunker  *SemanticChunker
	batch    int
}

// NewPipeline creates a new memory pipeline.
func NewPipeline(cfg *config.Config, embedder Embedder, repo *Repository) *Pipeline {
	batch := cfg.MaxEmbeddingBatch
	if batch <= 0 {
		batch = 100 // default OpenAI max
	}
	return &Pipeline{
		embedder: embedder,
		repo:     repo,
		chunker:  NewSemanticChunker(300, 50),
		batch:    batch,
	}
}

// EmbedMeeting fetches a meeting's transcripts, chunks them, embeds them, and saves them.
func (p *Pipeline) EmbedMeeting(ctx context.Context, meetingID string, meetingRepo *meeting.Repository) error {
	log := logger.With(zap.String("meeting_id", meetingID))
	log.Info("starting memory embed pipeline")

	// 1. Fetch segments
	segments, err := meetingRepo.GetSegments(meetingID)
	if err != nil {
		return fmt.Errorf("failed to get meeting segments: %w", err)
	}

	if len(segments) == 0 {
		log.Info("no segments to embed")
		return nil
	}

	// 2. Chunk segments semantically
	chunks := p.chunker.Chunk(meetingID, segments)
	log.Info("created embedding chunks", zap.Int("count", len(chunks)))

	if len(chunks) == 0 {
		return nil
	}

	// Set model name on chunks
	modelName := p.embedder.Model()
	for i := range chunks {
		chunks[i].Model = modelName
	}

	// 3. Process in batches
	for i := 0; i < len(chunks); i += p.batch {
		end := i + p.batch
		if end > len(chunks) {
			end = len(chunks)
		}
		batchChunks := chunks[i:end]

		// Extract texts for embedding
		texts := make([]string, len(batchChunks))
		for j, c := range batchChunks {
			texts[j] = c.Content
		}

		// Generate embeddings
		embeddings, err := p.embedder.Embed(ctx, texts)
		if err != nil {
			return fmt.Errorf("embedding batch %d-%d failed: %w", i, end, err)
		}

		// Attach vectors to chunks
		for j := range batchChunks {
			batchChunks[j].Embedding = embeddings[j]
		}

		// Save to DB
		if err := p.repo.UpsertChunks(ctx, batchChunks); err != nil {
			return fmt.Errorf("failed to save embedding batch: %w", err)
		}
	}

	log.Info("memory embed pipeline completed successfully")
	return nil
}
