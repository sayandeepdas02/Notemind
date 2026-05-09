package intelligence

import (
	"context"

	"notemind/internal/db"
)

// GraphNode represents an entity extracted from a meeting.
type GraphNode struct {
	ID         string
	MeetingID  string
	EntityType string // 'person', 'project', 'decision'
	Name       string
}

// GraphEdge represents a relationship between two entities.
type GraphEdge struct {
	FromID           string
	ToID             string
	RelationshipType string
	MeetingID        string
}

// GraphService handles knowledge graph operations.
type GraphService struct{}

func NewGraphService() *GraphService {
	return &GraphService{}
}

// AddNode adds an entity to the graph.
func (s *GraphService) AddNode(ctx context.Context, node GraphNode) (string, error) {
	var id string
	err := db.DB.QueryRowContext(ctx, `
		INSERT INTO meeting_entities (meeting_id, entity_type, name)
		VALUES ($1, $2, $3)
		ON CONFLICT (meeting_id, entity_type, name) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`, node.MeetingID, node.EntityType, node.Name).Scan(&id)
	return id, err
}

// AddEdge adds a relationship between two entities.
func (s *GraphService) AddEdge(ctx context.Context, edge GraphEdge) error {
	_, err := db.DB.ExecContext(ctx, `
		INSERT INTO entity_relationships (from_entity_id, to_entity_id, relationship_type, meeting_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT DO NOTHING
	`, edge.FromID, edge.ToID, edge.RelationshipType, edge.MeetingID)
	return err
}

// GetMeetingGraph returns all nodes and edges for a specific meeting.
func (s *GraphService) GetMeetingGraph(ctx context.Context, meetingID string) ([]GraphNode, []GraphEdge, error) {
	// Nodes
	nodeRows, err := db.DB.QueryContext(ctx, `
		SELECT id, entity_type, name FROM meeting_entities WHERE meeting_id = $1
	`, meetingID)
	if err != nil {
		return nil, nil, err
	}
	defer nodeRows.Close()

	var nodes []GraphNode
	for nodeRows.Next() {
		n := GraphNode{MeetingID: meetingID}
		if err := nodeRows.Scan(&n.ID, &n.EntityType, &n.Name); err != nil {
			return nil, nil, err
		}
		nodes = append(nodes, n)
	}

	// Edges
	edgeRows, err := db.DB.QueryContext(ctx, `
		SELECT from_entity_id, to_entity_id, relationship_type FROM entity_relationships WHERE meeting_id = $1
	`, meetingID)
	if err != nil {
		return nil, nil, err
	}
	defer edgeRows.Close()

	var edges []GraphEdge
	for edgeRows.Next() {
		e := GraphEdge{MeetingID: meetingID}
		if err := edgeRows.Scan(&e.FromID, &e.ToID, &e.RelationshipType); err != nil {
			return nil, nil, err
		}
		edges = append(edges, e)
	}

	return nodes, edges, nil
}
