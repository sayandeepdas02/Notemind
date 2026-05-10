'use client';

// TranscriptPanel — the canonical live transcript renderer
// Handles: empty states per status, speaker grouping, auto-scroll, reconnect banner

import { useEffect, useRef } from 'react';
import { AlignLeft, Video, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranscriptSegment, MeetingStatus } from '@/types/api';

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// Stable color mapping from speaker name → avatar gradient
const SPEAKER_COLORS = [
  'from-indigo-500 to-purple-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-fuchsia-500',
];

function getSpeakerColor(speaker: string): string {
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = (hash * 31 + speaker.charCodeAt(i)) >>> 0;
  }
  return SPEAKER_COLORS[hash % SPEAKER_COLORS.length];
}

// ── Status-Aware Empty States ────────────────────────────────

interface EmptyTranscriptProps {
  status: MeetingStatus;
  connectionState: 'connecting' | 'live' | 'reconnecting' | 'closed';
}

function EmptyTranscriptState({ status, connectionState }: EmptyTranscriptProps) {
  if (connectionState === 'reconnecting' || status === 'joining') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Joining meeting...'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {connectionState === 'reconnecting'
              ? 'Connection lost. We\'ll be back in a moment.'
              : 'The Notemind bot is being dispatched.'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'waiting_for_admission') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-yellow-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Waiting for admission</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ask the host to admit the Notemind bot.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'recording' || status === 'admitted') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
          <Video size={20} className="text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Recording in progress</p>
          <p className="text-xs text-muted-foreground mt-1">
            Transcript will appear here as participants speak.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
        <AlignLeft size={20} className="text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">No transcript available</p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  status: MeetingStatus;
  connectionState: 'connecting' | 'live' | 'reconnecting' | 'closed';
  className?: string;
}

export function TranscriptPanel({
  segments,
  status,
  connectionState,
  className,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll only when near bottom (within 120px)
  useEffect(() => {
    const el = bottomRef.current?.parentElement;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments.length]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-border flex items-center justify-between bg-background/50">
        <div className="flex items-center gap-2">
          <AlignLeft size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Transcript</h2>
        </div>
        <div className="flex items-center gap-2">
          {connectionState === 'reconnecting' && (
            <span className="text-xs text-yellow-400 font-medium flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Reconnecting
            </span>
          )}
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {segments.length} segments
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1">
        {segments.length === 0 ? (
          <EmptyTranscriptState status={status} connectionState={connectionState} />
        ) : (
          segments.map((seg, i) => {
            const prevSeg = segments[i - 1];
            const showSpeakerHeader =
              i === 0 || prevSeg.speaker !== seg.speaker;
            const speakerColor = getSpeakerColor(seg.speaker);

            return (
              <div key={seg.id} className={showSpeakerHeader ? 'pt-5' : 'pt-0.5'}>
                {showSpeakerHeader && (
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full bg-gradient-to-tr flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm',
                        speakerColor
                      )}
                    >
                      {(seg.speaker || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      {seg.speaker || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(seg.absolute_start_time)}
                    </span>
                  </div>
                )}
                <p className="text-sm text-foreground/75 leading-relaxed pl-8.5">
                  {seg.text}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
