package worker

import (
	"fmt"
	"time"

	"github.com/go-redsync/redsync/v4"
	goredis "github.com/go-redsync/redsync/v4/redis/goredis/v9"
	redis "github.com/redis/go-redis/v9"
)

// Scaler manages distributed concurrency for the worker fleet.
type Scaler struct {
	rs *redsync.Redsync
}

func NewScaler(redisClient *redis.Client) *Scaler {
	pool := goredis.NewPool(redisClient)
	return &Scaler{
		rs: redsync.New(pool),
	}
}

// AcquireMeetingLock prevents multiple workers from processing the same meeting
// concurrently, which is critical during horizontal autoscaling.
func (s *Scaler) AcquireMeetingLock(meetingID string) (*redsync.Mutex, error) {
	mutexname := fmt.Sprintf("lock:meeting:%s", meetingID)
	
	// Create a mutex with 15 minute expiry
	mutex := s.rs.NewMutex(mutexname, redsync.WithExpiry(15*time.Minute))

	// Attempt to acquire lock
	if err := mutex.Lock(); err != nil {
		return nil, fmt.Errorf("failed to acquire distributed lock for meeting %s: %w", meetingID, err)
	}

	return mutex, nil
}

// ReleaseMeetingLock frees a lock.
func (s *Scaler) ReleaseMeetingLock(mutex *redsync.Mutex) error {
	if mutex == nil {
		return nil
	}
	_, err := mutex.Unlock()
	return err
}

// DetermineQueuePartition evaluates a workspace's billing plan to route tasks
// to prioritized queues (e.g., enterprise customers jump to the front).
func DetermineQueuePartition(plan string) string {
	switch plan {
	case "enterprise":
		return "high_priority"
	case "pro":
		return "default"
	case "free":
		return "low_priority"
	default:
		return "default"
	}
}
