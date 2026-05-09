package memory

import (
	"context"

	"notemind/internal/intelligence"
)

// WorkspaceInsights contains AI-generated metrics and clusters for the workspace.
type WorkspaceInsights struct {
	TrendingTopics    []intelligence.Topic
	OpenActionItems   []intelligence.ActionItem
	UnresolvedCount   int
	RecentDecisions   []intelligence.Decision
}

// InsightsService orchestrates fetching intelligence data.
type InsightsService struct {
	topicsSvc    *intelligence.TopicService
	actionsSvc   *intelligence.ActionService
	decisionsSvc *intelligence.DecisionService
}

func NewInsightsService(ts *intelligence.TopicService, as *intelligence.ActionService, ds *intelligence.DecisionService) *InsightsService {
	return &InsightsService{
		topicsSvc:    ts,
		actionsSvc:   as,
		decisionsSvc: ds,
	}
}

// GenerateWeeklyInsights gathers actionable insights for a user's dashboard.
func (s *InsightsService) GenerateWeeklyInsights(ctx context.Context, userID string) (WorkspaceInsights, error) {
	var insights WorkspaceInsights

	// 1. Trending Topics (top 5)
	topics, err := s.topicsSvc.GetTrendingTopics(ctx, userID, 5)
	if err == nil {
		insights.TrendingTopics = topics
	}

	// 2. Open Action Items
	actions, err := s.actionsSvc.GetUserActionItems(ctx, userID)
	if err == nil {
		insights.OpenActionItems = actions
		insights.UnresolvedCount = len(actions)
	}

	// 3. Recent Decisions (limit to 10 for dashboard)
	decisions, err := s.decisionsSvc.GetUserDecisions(ctx, userID)
	if err == nil {
		if len(decisions) > 10 {
			insights.RecentDecisions = decisions[:10]
		} else {
			insights.RecentDecisions = decisions
		}
	}

	return insights, nil
}
