'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Share2, StopCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { api, APIError } from '@/lib/api';
import type { Meeting, MeetingIntelligence, ShareMeetingResponse } from '@/types/api';
import { useMeetingStream, LIVE_STATUSES, ENDED_STATUSES } from '@/features/meetings/hooks/useMeetingStream';
import { TranscriptPanel } from '@/features/meetings/components/TranscriptPanel';
import { InsightsPanel } from '@/features/meetings/components/InsightsPanel';
import { AIChatPanel } from '@/features/meetings/components/AIChatPanel';
import { StatusBadge } from '@/components/ui/status-badge';
import { Panel } from '@/components/ui/panel';

// ── Share Modal ───────────────────────────────────────────────

interface ShareModalProps {
  link: string;
  onClose: () => void;
}

function ShareModal({ link, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <Panel padding="lg">
          <h3 className="text-base font-semibold text-foreground mb-1">Share Insights</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Anyone with this link can view the meeting summary, key points, and action items.
            The raw transcript remains private.
          </p>
          <div className="flex items-center gap-2 mb-5">
            <input
              type="text"
              readOnly
              value={link}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none select-all"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={copy}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-surface-3 text-foreground rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Close
          </button>
        </Panel>
      </motion.div>
    </motion.div>
  );
}

// ── Right panel tabs ──────────────────────────────────────────

type RightTab = 'chat' | 'participants';

// ── Page ──────────────────────────────────────────────────────

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [intelligence, setIntelligence] = useState<MeetingIntelligence | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('chat');
  const [stopping, setStopping] = useState(false);

  // Fetch intelligence when meeting ends
  const fetchIntelligence = useCallback(async () => {
    try {
      const data = await api.get<MeetingIntelligence>(`/meetings/${id}/summary`);
      if (data) setIntelligence(data);
    } catch {
      // Summary may not be ready yet — silent fail
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        const m = await api.get<Meeting>(`/meetings/${id}`);
        setMeeting(m);
        // Pre-fetch intelligence if already completed
        if (ENDED_STATUSES.has(m.status)) {
          await fetchIntelligence();
        }
      } catch (err) {
        setPageError(
          err instanceof APIError ? err.message : 'Meeting not found.'
        );
      }
    };
    load();
  }, [id, fetchIntelligence]);

  // SSE stream
  const { segments, status, connectionState } = useMeetingStream({
    meetingId: id,
    initialStatus: meeting?.status ?? 'pending',
    onEnded: () => {
      // Delay fetch to allow AI pipeline to complete
      setTimeout(fetchIntelligence, 2500);
    },
  });

  const isLive = LIVE_STATUSES.has(status);

  const stopBot = async () => {
    setStopping(true);
    try {
      await api.delete(`/meetings/${id}/bot`);
    } catch (err) {
      console.error('Stop bot failed:', err instanceof APIError ? err.message : err);
    } finally {
      setStopping(false);
    }
  };

  const generateShareLink = async () => {
    try {
      const data = await api.post<ShareMeetingResponse>(`/meetings/${id}/share`, {});
      if (data?.share_token) {
        setShareLink(`${window.location.origin}/share/${data.share_token}`);
      }
    } catch {
      // TODO: surface via toast
    }
  };

  // ── Error State ───────────────────────────────────────────

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <StopCircle size={24} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Meeting not found</h2>
          <p className="text-sm text-muted-foreground">{pageError}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2 bg-surface-3 border border-border text-foreground rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 lg:p-5 gap-4">
      {/* ── Header ──────────────────────────────────────────── */}
      <Panel padding="none" className="shrink-0">
        <div className="flex items-center gap-4 px-5 py-3.5">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-1.5 text-muted-foreground hover:text-foreground bg-surface-3 border border-border rounded-lg transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {meeting?.title ?? meeting?.meeting_url?.replace('https://', '') ?? 'Meeting'}
            </h1>
            <StatusBadge status={status} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLive && (
              <button
                onClick={stopBot}
                disabled={stopping}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <StopCircle size={14} />
                {stopping ? 'Stopping…' : 'Stop Bot'}
              </button>
            )}
            <button
              onClick={generateShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-3 border border-border text-foreground rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        </div>
      </Panel>

      {/* ── 3-Panel Body ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">

        {/* Left: Transcript */}
        <Panel padding="none" className="flex-1 lg:w-1/3 flex flex-col overflow-hidden">
          <TranscriptPanel
            segments={segments}
            status={status}
            connectionState={connectionState}
            className="flex-1"
          />
        </Panel>

        {/* Center: Insights */}
        <Panel padding="none" className="flex-1 lg:w-1/3 flex flex-col overflow-hidden">
          <InsightsPanel
            intelligence={intelligence}
            isLive={isLive}
            className="flex-1"
          />
        </Panel>

        {/* Right: AI Chat + Participants */}
        <Panel padding="none" className="flex-1 lg:w-1/3 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="shrink-0 flex gap-1 px-3 py-2.5 border-b border-border bg-background/50">
            {(['chat', 'participants'] as RightTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  rightTab === tab
                    ? 'bg-surface-3 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'chat' ? null : <Users size={12} />}
                {tab === 'chat' ? 'AI Chat' : 'Participants'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === 'chat' && (
              <AIChatPanel meetingId={id} className="h-full" />
            )}
            {rightTab === 'participants' && (
              <div className="p-4 space-y-2 overflow-y-auto h-full">
                {!intelligence?.participants?.length ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Users size={28} className="opacity-20" />
                    <p className="text-sm">Participants will appear after the meeting.</p>
                  </div>
                ) : (
                  intelligence.participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-3 border border-border rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                        {p.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">{p}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareLink && (
          <ShareModal link={shareLink} onClose={() => setShareLink(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
