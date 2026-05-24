package meeting

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"notemind/internal/ai"
	"notemind/internal/ai/prompts"
	"notemind/internal/provider"
	"notemind/internal/queue"
	"notemind/pkg/logger"
)

const (
	// idleTimeout is how long the stream goroutine waits with no new segments
	// before marking the meeting as "ended".
	idleTimeout = 5 * time.Minute
	// maxMeetingDuration caps the background goroutine lifetime.
	maxMeetingDuration = 8 * time.Hour
)

type Service struct {
	repo        *Repository
	queueClient *queue.Client
	hub         *Hub
	aiPipeline  *ai.Pipeline
	providers   *provider.Registry
}

func NewService(repo *Repository, queueClient *queue.Client, hub *Hub, aiPipeline *ai.Pipeline, providers *provider.Registry) *Service {
	return &Service{
		repo:        repo,
		queueClient: queueClient,
		hub:         hub,
		aiPipeline:  aiPipeline,
		providers:   providers,
	}
}

// ─── Phase 1: Audio File Upload (kept for backward compatibility) ─────────────

func (s *Service) UploadMeeting(filePath string, userID string) (string, error) {
	meetingID := uuid.New().String()
	m := &Meeting{
		ID:       meetingID,
		AudioURL: filePath,
		Status:   "pending",
	}
	if err := s.repo.CreateMeeting(m, userID); err != nil {
		return "", fmt.Errorf("could not create meeting in DB: %w", err)
	}
	logger.L.Info("created meeting in database", zap.String("meeting_id", meetingID))

	if err := s.queueClient.EnqueueTranscription(meetingID, filePath); err != nil {
		logger.L.Error("could not enqueue meeting", zap.String("meeting_id", meetingID), zap.Error(err))
		if markErr := s.repo.UpdateMeetingStatus(meetingID, "failed"); markErr != nil {
			logger.L.Error("additionally failed to mark meeting as failed after enqueue error",
				zap.String("meeting_id", meetingID), zap.Error(markErr))
		}
		return "", fmt.Errorf("could not enqueue job: %w", err)
	}
	return meetingID, nil
}

// ─── Phase 2: Vexa Live Meeting Join ─────────────────────────────────────────

// JoinMeeting auto-detects the provider (Google Meet / Zoom / Teams), dispatches
// the bot, persists the meeting, and starts the streaming goroutine.
func (s *Service) JoinMeeting(meetingURL string, userID string, meetingType string) (*Meeting, error) {
	meetingID := uuid.New().String()
	if meetingType == "" {
		meetingType = "general"
	}

	// Detect provider
	prov, err := s.providers.Detect(meetingURL)
	if err != nil {
		return nil, fmt.Errorf("unsupported meeting URL: %w", err)
	}

	m := &Meeting{
		ID:          meetingID,
		MeetingURL:  meetingURL,
		Status:      "joining",
		MeetingType: meetingType,
	}
	if err := s.repo.CreateMeeting(m, userID); err != nil {
		return nil, fmt.Errorf("failed to save meeting: %w", err)
	}
	logger.L.Info("created meeting record",
		zap.String("meeting_id", meetingID),
		zap.String("provider", prov.Name()),
	)

	// Set provider on meeting row
	if err := s.repo.UpdateMeetingProvider(meetingID, prov.Name()); err != nil {
		logger.L.Warn("failed to set meeting provider", zap.Error(err))
	}

	// Dispatch bot via provider
	handle, err := prov.StartBot(context.Background(), meetingURL, provider.BotOptions{UserID: userID})
	if err != nil {
		logger.L.Error("StartBot failed",
			zap.String("meeting_id", meetingID),
			zap.String("provider", prov.Name()),
			zap.Error(err))
		_ = s.repo.UpdateMeetingStatus(meetingID, "failed")
		s.hub.PublishStatus(meetingID, "failed")
		return nil, fmt.Errorf("provider could not start bot: %w", err)
	}

	// Persist native meeting ID
	if err := s.repo.UpdateMeetingNativeID(meetingID, handle.NativeID); err != nil {
		logger.L.Error("failed to store native_meeting_id", zap.Error(err))
	}
	m.NativeMeetingID = handle.NativeID

	if err := s.repo.UpdateMeetingStatus(meetingID, "live"); err != nil {
		logger.L.Error("failed to set status=live", zap.Error(err))
	}
	m.Status = "live"
	s.hub.PublishStatus(meetingID, "live")

	// Launch streaming goroutine with provider
	go s.streamTranscripts(meetingID, handle.NativeID, prov)

	return m, nil
}

// streamTranscripts is the long-running goroutine that:
//  1. Connects to the provider's stream and consumes transcript segments
//  2. Batch-inserts segments into the DB
//  3. Broadcasts new segments to all SSE subscribers via the hub
//  4. Detects meeting end and marks it accordingly
func (s *Service) streamTranscripts(meetingID, nativeMeetingID string, prov provider.MeetingProvider) {
	log := logger.With(
		zap.String("meeting_id", meetingID),
		zap.String("native_meeting_id", nativeMeetingID),
	)
	log.Info("stream goroutine started")

	ctx, cancel := context.WithTimeout(context.Background(), maxMeetingDuration)
	defer cancel()

	// idleTimer fires if no segments arrive within idleTimeout — signals meeting end
	idleTimer := time.NewTimer(idleTimeout)
	defer idleTimer.Stop()

	// segmentCh carries batched segments from the provider stream goroutine
	segmentCh := make(chan []provider.TranscriptSegment, 32)
	// statusCh carries meeting status updates from Vexa
	statusCh := make(chan string, 16)

	// Kick off the provider's stream reader as a nested goroutine
	go func() {
		prov.ConnectAndStream(ctx, nativeMeetingID,
			func(segs []provider.TranscriptSegment) {
				select {
				case segmentCh <- segs:
				case <-ctx.Done():
				}
			}, func(status string) {
				select {
				case statusCh <- status:
				case <-ctx.Done():
				}
			})
		close(segmentCh)
		close(statusCh)
	}()

	for {
		select {
		case <-ctx.Done():
			s.endMeeting(meetingID, "ended")
			return

		case <-idleTimer.C:
			log.Info("idle timeout reached, marking meeting ended")
			s.endMeeting(meetingID, "ENDED")
			return

		case status, ok := <-statusCh:
			if !ok {
				continue
			}
			if status == "heartbeat" {
				Heartbeat(context.Background(), meetingID)
				continue
			}

			mappedState := mapVexaStatus(status)
			if err := TransitionState(context.Background(), meetingID, mappedState, "Vexa WS status update"); err != nil {
				log.Error("failed to transition state from Vexa WS", zap.String("vexa_status", status), zap.Error(err))
			} else {
				s.hub.PublishStatus(meetingID, string(mappedState))
			}
			Heartbeat(context.Background(), meetingID)

			if mappedState == StateEnded || mappedState == StateFailed {
				s.endMeeting(meetingID, string(mappedState))
				return
			}

		case segs, ok := <-segmentCh:
			if !ok {
				// Vexa streamer closed the channel → meeting is over
				log.Info("Vexa stream closed, marking meeting ended")
				s.endMeeting(meetingID, "ENDED")
				return
			}

			// Update heartbeat on receiving segments
			Heartbeat(context.Background(), meetingID)

			// Reset idle timer on every received batch
			if !idleTimer.Stop() {
				select {
				case <-idleTimer.C:
				default:
				}
			}
			idleTimer.Reset(idleTimeout)

			// Normalise provider segments to DB model
			dbSegs := make([]TranscriptSegment, 0, len(segs))
			for _, seg := range segs {
				dbSegs = append(dbSegs, TranscriptSegment{
					ID:                uuid.New().String(),
					MeetingID:         meetingID,
					Speaker:           seg.Speaker,
					Text:              seg.Text,
					AbsoluteStartTime: seg.AbsoluteStartTime,
					AbsoluteEndTime:   seg.AbsoluteEndTime,
				})
			}

			if err := s.repo.BulkInsertSegments(meetingID, dbSegs); err != nil {
				log.Error("DB insert failed for segments", zap.Error(err), zap.Int("count", len(dbSegs)))
				continue
			}
			log.Info("saved transcript segments", zap.Int("count", len(dbSegs)))

			// Broadcast to all SSE-connected browsers
			s.hub.PublishSegments(meetingID, dbSegs)
		}
	}
}

// endMeeting updates the meeting status and broadcasts the new status.
func (s *Service) endMeeting(meetingID, status string) {
	if err := TransitionState(context.Background(), meetingID, MeetingState(status), "endMeeting called"); err != nil {
		logger.L.Error("failed to update meeting status on end",
			zap.String("meeting_id", meetingID),
			zap.String("status", status),
			zap.Error(err))
	}
	s.hub.PublishStatus(meetingID, status)

	// If the meeting successfully ended, trigger the Phase 3 AI Summary Pipeline
	if status == "ENDED" || status == "completed" {
		go s.generateMeetingIntelligence(meetingID)
	}
}

func mapVexaStatus(vexaStatus string) MeetingState {
	switch vexaStatus {
	case "joining":
		return StateJoining
	case "awaiting_admission":
		return StateWaitingForAdmission
	case "active", "live":
		return StateRecording
	case "completed":
		return StateEnded
	case "failed":
		return StateFailed
	case "denied":
		return StateDenied
	default:
		return MeetingState(vexaStatus)
	}
}

// generateMeetingIntelligence runs the multi-stage LLM pipeline on the meeting transcripts.
func (s *Service) generateMeetingIntelligence(meetingID string) {
	log := logger.With(zap.String("meeting_id", meetingID))
	log.Info("AI pipeline starting")

	// 1. Fetch all transcript segments
	segs, err := s.repo.GetSegments(meetingID)
	if err != nil {
		log.Error("failed to fetch segments for AI pipeline", zap.Error(err))
		return
	}

	if len(segs) == 0 {
		log.Info("no transcript segments found, skipping AI pipeline")
		return
	}

	// 2. Convert to AI module's expected format
	var rawSegs []ai.RawSegment
	for _, seg := range segs {
		rawSegs = append(rawSegs, ai.RawSegment{
			Speaker:           seg.Speaker,
			Text:              seg.Text,
			AbsoluteStartTime: seg.AbsoluteStartTime,
		})
	}

	// 3. Run Pipeline with correct meeting-type prompt
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	meetingType := prompts.TypeGeneral
	if m, err := s.repo.GetMeetingByID(meetingID); err == nil && m != nil {
		if mt := prompts.MeetingType(m.MeetingType); mt != "" {
			meetingType = mt
		}
	}

	summary, err := s.aiPipeline.Run(ctx, rawSegs, meetingType)
	if err != nil {
		log.Error("AI pipeline failed", zap.Error(err))
		return
	}

	// 4. Save structured results
	if err := s.repo.SaveMeetingIntelligence(meetingID, summary); err != nil {
		log.Error("failed to save meeting intelligence", zap.Error(err))
		return
	}

	log.Info("AI pipeline completed",
		zap.Int("action_items", len(summary.ActionItems)),
		zap.Int("decisions", len(summary.Decisions)),
		zap.Int("key_points", len(summary.KeyPoints)),
	)
}

// StopMeeting uses the provider registry to stop the bot and ends the meeting.
func (s *Service) StopMeeting(meetingID string, userID string) error {
	m, err := s.repo.GetMeeting(meetingID, userID)
	if err != nil || m == nil {
		return fmt.Errorf("meeting not found: %s", meetingID)
	}
	if m.NativeMeetingID == "" {
		return fmt.Errorf("no native_meeting_id for meeting %s", meetingID)
	}

	// Detect provider by meeting URL (fall back to google_meet if detection fails)
	prov, err := s.providers.Detect(m.MeetingURL)
	if err != nil {
		// Try by stored provider name
		prov, err = s.providers.ByName("google_meet")
		if err != nil {
			return fmt.Errorf("cannot determine provider for meeting %s", meetingID)
		}
	}

	if err := prov.StopBot(context.Background(), m.NativeMeetingID); err != nil {
		return err
	}
	s.endMeeting(meetingID, "ENDED")
	return nil
}

// ─── Read Methods ─────────────────────────────────────────────────────────────

func (s *Service) GetMeetings(userID string) ([]Meeting, error)             { return s.repo.GetMeetings(userID) }
func (s *Service) GetMeeting(id string, userID string) (*Meeting, error)     { return s.repo.GetMeeting(id, userID) }
func (s *Service) GetSegments(meetingID string) ([]TranscriptSegment, error) {
	return s.repo.GetSegments(meetingID)
}
func (s *Service) GetSegmentsAfter(meetingID string, lastSeq int) ([]TranscriptSegment, error) {
	return s.repo.GetSegmentsAfter(meetingID, lastSeq)
}
func (s *Service) GetTranscript(meetingID string) (*Transcript, error) {
	return s.repo.GetTranscript(meetingID)
}
func (s *Service) GetSummary(meetingID string) (*Summary, error) {
	return s.repo.GetSummary(meetingID)
}
func (s *Service) GetMeetingIntelligence(meetingID string) (*ai.MeetingSummary, error) {
	return s.repo.GetMeetingIntelligence(meetingID)
}
