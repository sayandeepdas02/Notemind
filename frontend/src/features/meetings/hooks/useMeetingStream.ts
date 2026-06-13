// useMeetingStream — isolated SSE connection manager
// Single responsibility: connect, parse, and broadcast meeting events
// All calling components receive clean, typed state — no SSE logic lives in pages

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, createSSEConnection } from '@/lib/api';
import type { MeetingStatus, TranscriptSegment, SSEEvent } from '@/types/api';

function mergeSegments(
  existing: TranscriptSegment[],
  incoming: TranscriptSegment[]
): TranscriptSegment[] {
  const map = new Map<string, TranscriptSegment>(existing.map(s => [s.id, s]));
  for (const s of incoming) map.set(s.id, s);
  return [...map.values()].sort(
    (a, b) =>
      new Date(a.absolute_start_time).getTime() -
      new Date(b.absolute_start_time).getTime()
  );
}

type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'closed';

interface UseMeetingStreamOptions {
  meetingId: string;
  initialStatus: MeetingStatus;
  onEnded?: () => void;
}

interface UseMeetingStreamResult {
  segments: TranscriptSegment[];
  status: MeetingStatus;
  connectionState: ConnectionState;
}

const LIVE_STATUSES = new Set<MeetingStatus>([
  'joining',
  'waiting_for_admission',
  'admitted',
  'recording',
]);

const ENDED_STATUSES = new Set<MeetingStatus>([
  'completed',
  'failed',
  'denied',
  'disconnected',
  'ended',
]);

export function useMeetingStream({
  meetingId,
  initialStatus,
  onEnded,
}: UseMeetingStreamOptions): UseMeetingStreamResult {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [status, setStatus] = useState<MeetingStatus>(initialStatus);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  const sseRef = useRef<EventSource | null>(null);
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; });

  const close = useCallback(() => {
    sseRef.current?.close();
    sseRef.current = null;
    setConnectionState('closed');
  }, []);

  // Sync status if initialStatus changes
  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  // Fetch transcripts for completed/ended meetings
  useEffect(() => {
    if (ENDED_STATUSES.has(status) && segments.length === 0) {
      api.get<TranscriptSegment[]>(`/meetings/${meetingId}/transcripts`)
        .then(data => {
          if (data) setSegments(data);
        })
        .catch(err => {
          console.error('Failed to fetch transcripts:', err);
        });
    }
  }, [meetingId, status, segments.length]);

  useEffect(() => {
    // If already ended on load, skip SSE connection
    if (ENDED_STATUSES.has(initialStatus)) {
      setConnectionState('closed');
      return;
    }

    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let mounted = true;

    async function connect() {
      if (!mounted) return;
      setConnectionState('connecting');

      let sse: EventSource;
      try {
        sse = await createSSEConnection(meetingId);
      } catch {
        if (!mounted) return;
        setConnectionState('reconnecting');
        reconnectTimeout = setTimeout(connect, 3000);
        return;
      }

      if (!mounted) {
        sse.close();
        return;
      }

      sseRef.current = sse;

      sse.onopen = () => {
        if (mounted) setConnectionState('live');
      };

      sse.onmessage = (e: MessageEvent<string>) => {
        if (!mounted) return;
        try {
          const event = JSON.parse(e.data) as SSEEvent;

          if (event.type === 'segments') {
            setSegments(prev => mergeSegments(prev, event.data));
          }

          if (event.type === 'status') {
            const nextStatus = event.data.status;
            setStatus(nextStatus);

            if (ENDED_STATUSES.has(nextStatus)) {
              sse.close();
              setConnectionState('closed');
              onEndedRef.current?.();
            }
          }
        } catch {
          // Ignore malformed SSE frames
        }
      };

      sse.onerror = () => {
        if (!mounted) return;
        sse.close();
        sseRef.current = null;

        if (ENDED_STATUSES.has(status)) {
          setConnectionState('closed');
          return;
        }

        setConnectionState('reconnecting');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimeout);
      sseRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  return { segments, status, connectionState };
}

export { LIVE_STATUSES, ENDED_STATUSES };
