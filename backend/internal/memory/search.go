package memory

import (
	"context"
	"fmt"
)

// SearchService handles semantic searches across the memory repository.
type SearchService struct {
	repo     *Repository
	embedder Embedder
}

// NewSearchService creates a new SearchService.
func NewSearchService(repo *Repository, embedder Embedder) *SearchService {
	return &SearchService{
		repo:     repo,
		embedder: embedder,
	}
}

// Search performs a semantic vector search across meeting chunks.
func (s *SearchService) Search(ctx context.Context, userID, query string, filters SearchFilters, limit int) ([]SearchResult, error) {
	if query == "" {
		return nil, fmt.Errorf("search query cannot be empty")
	}

	if limit <= 0 {
		limit = 10
	}

	// 1. Embed the search query
	embeddings, err := s.embedder.Embed(ctx, []string{query})
	if err != nil {
		return nil, fmt.Errorf("failed to embed search query: %w", err)
	}

	if len(embeddings) == 0 {
		return nil, fmt.Errorf("embedder returned no vectors for query")
	}

	queryVector := embeddings[0]

	// 2. Perform similarity search in Postgres
	results, err := s.repo.SimilaritySearch(ctx, userID, queryVector, limit, filters)
	if err != nil {
		return nil, fmt.Errorf("similarity search failed: %w", err)
	}

	return results, nil
}
