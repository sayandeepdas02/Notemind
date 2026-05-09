package intelligence

import (
	"context"
	"fmt"

	"github.com/lib/pq"
	"go.uber.org/zap"

	"notemind/internal/db"
	"notemind/pkg/logger"
)

// Topic represents a cluster of semantically related discussions across meetings.
type Topic struct {
	ID           string
	UserID       string
	TopicName    string
	Summary      string
	MeetingIDs   []string
	MentionCount int
}

// TopicService handles cross-meeting topic clustering.
type TopicService struct{}

func NewTopicService() *TopicService {
	return &TopicService{}
}

// ClusterTopics would normally run as a nightly cron job to find semantic clusters
// across all a user's meetings. This is a simplified implementation.
func (s *TopicService) ClusterTopics(ctx context.Context, userID string) error {
	log := logger.With(zap.String("user_id", userID))
	log.Info("starting topic clustering")

	// 1. Fetch all unique topics extracted from recent meetings.
	// In a real implementation, this would cluster vector embeddings.
	// For now, we aggregate exact matches from meeting entities or keywords.
	
	rows, err := db.DB.QueryContext(ctx, `
		SELECT name, array_agg(DISTINCT meeting_id), count(*)
		FROM meeting_entities
		WHERE entity_type = 'topic' AND meeting_id IN (
			SELECT id FROM meetings WHERE user_id = $1
		)
		GROUP BY name
		HAVING count(*) > 1
	`, userID)
	
	if err != nil {
		return fmt.Errorf("failed to aggregate topics: %w", err)
	}
	defer rows.Close()

	var clusters []Topic
	for rows.Next() {
		var t Topic
		var meetingIDs []string
		if err := rows.Scan(&t.TopicName, pq.Array(&meetingIDs), &t.MentionCount); err != nil {
			return err
		}
		t.UserID = userID
		t.MeetingIDs = meetingIDs
		clusters = append(clusters, t)
	}

	// 2. Upsert into cross_meeting_topics
	for _, c := range clusters {
		_, err := db.DB.ExecContext(ctx, `
			INSERT INTO cross_meeting_topics (user_id, topic, meeting_ids, mention_count)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (user_id, topic) DO UPDATE SET 
				meeting_ids = array_cat(cross_meeting_topics.meeting_ids, EXCLUDED.meeting_ids),
				mention_count = cross_meeting_topics.mention_count + EXCLUDED.mention_count,
				last_seen_at = NOW()
		`, c.UserID, c.TopicName, pq.Array(c.MeetingIDs), c.MentionCount)
		
		if err != nil {
			log.Error("failed to upsert topic cluster", zap.Error(err), zap.String("topic", c.TopicName))
		}
	}

	log.Info("topic clustering complete", zap.Int("clusters_found", len(clusters)))
	return nil
}

// GetTrendingTopics returns the top topics for a user.
func (s *TopicService) GetTrendingTopics(ctx context.Context, userID string, limit int) ([]Topic, error) {
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, topic, COALESCE(summary, ''), meeting_ids, mention_count
		FROM cross_meeting_topics
		WHERE user_id = $1
		ORDER BY mention_count DESC, last_seen_at DESC
		LIMIT $2
	`, userID, limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var topics []Topic
	for rows.Next() {
		var t Topic
		var mIDs []string
		if err := rows.Scan(&t.ID, &t.TopicName, &t.Summary, pq.Array(&mIDs), &t.MentionCount); err != nil {
			return nil, err
		}
		t.MeetingIDs = mIDs
		topics = append(topics, t)
	}

	return topics, nil
}
