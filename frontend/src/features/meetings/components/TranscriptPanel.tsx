'use client';

import { useEffect, useRef } from 'react';
import { AlignLeft, Video, Loader2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranscriptSegment, MeetingStatus } from '@/types/api';

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

const SPEAKER_COLORS = [
  'bg-green-600', 'bg-teal-600', 'bg-blue-600',
  'bg-purple-600', 'bg-orange-500', 'bg-rose-500',
];

function getSpeakerColor(speaker: string): string {
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) hash = (hash * 31 + speaker.charCodeAt(i)) >>> 0;
  return SPEAKER_COLORS[hash % SPEAKER_COLORS.length];
}

// ── Empty states ──────────────────────────────────────────────

interface EmptyTranscriptProps {
  status: MeetingStatus;
  connectionState: 'connecting' | 'live' | 'reconnecting' | 'closed';
}

function EmptyTranscriptState({ status, connectionState }: EmptyTranscriptProps) {
  if (connectionState === 'reconnecting' || status === 'joining') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Joining meeting...'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {connectionState === 'reconnecting'
              ? 'Connection lost. Recovering...'
              : 'The Notemind bot is joining.'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'waiting_for_admission') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
        <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-yellow-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Waiting for admission</p>
          <p className="text-xs text-gray-400 mt-1">Ask the host to admit the Notemind bot.</p>
        </div>
      </div>
    );
  }

  if (status === 'recording' || status === 'admitted') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
          <Video size={20} className="text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Recording in progress</p>
          <p className="text-xs text-gray-400 mt-1">Transcript appears as participants speak.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <AlignLeft size={20} className="text-gray-300" />
      </div>
      <p className="text-sm text-gray-400">No transcript available</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  status: MeetingStatus;
  connectionState: 'connecting' | 'live' | 'reconnecting' | 'closed';
  className?: string;
}

export function TranscriptPanel({ segments, status, connectionState, className }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bottomRef.current?.parentElement;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments.length]);

  const copyTranscript = () => {
    const text = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlignLeft size={15} className="text-green-600" />
          <h2 className="text-sm font-semibold text-gray-900">Transcript</h2>
        </div>
        <div className="flex items-center gap-2">
          {connectionState === 'reconnecting' && (
            <span className="text-xs text-yellow-600 font-medium flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Reconnecting
            </span>
          )}
          {segments.length > 0 && (
            <button onClick={copyTranscript}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              title="Copy transcript">
              <Copy size={13} />
            </button>
          )}
          <span className="text-xs text-gray-400 font-mono tabular-nums">
            {segments.length} segs
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
            const showSpeakerHeader = i === 0 || prevSeg.speaker !== seg.speaker;
            const speakerColor = getSpeakerColor(seg.speaker);

            return (
              <div key={seg.id} className={showSpeakerHeader ? 'pt-5' : 'pt-0.5'}>
                {showSpeakerHeader && (
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                      speakerColor
                    )}>
                      {(seg.speaker || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-gray-800">
                      {seg.speaker || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(seg.absolute_start_time)}
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-600 leading-relaxed pl-8">
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
