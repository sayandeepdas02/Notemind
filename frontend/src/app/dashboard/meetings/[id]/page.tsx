'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Share2, StopCircle, Users, Clock,
  CheckCircle2, FileText, Target, Brain, Copy,
  Check, Download, AlignLeft, MessageSquare, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { api, APIError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Meeting, MeetingIntelligence, ShareMeetingResponse } from '@/types/api';
import { useMeetingStream, LIVE_STATUSES, ENDED_STATUSES } from '@/features/meetings/hooks/useMeetingStream';
import { TranscriptPanel } from '@/features/meetings/components/TranscriptPanel';
import { AIChatPanel } from '@/features/meetings/components/AIChatPanel';
import { InsightsPanel } from '@/features/meetings/components/InsightsPanel';
import { StatusBadge } from '@/components/ui/status-badge';

// ── Meeting type badge ────────────────────────────────────────

const MEETING_TYPE_STYLES: Record<string, { label: string; className: string }> = {
  standup:   { label: 'Standup',   className: 'bg-gray-100 text-ink-3 border-gray-200'  },
  interview: { label: 'Interview', className: 'bg-gray-100 text-ink-3 border-gray-200'  },
  sales:     { label: 'Sales',     className: 'bg-brand-light text-brand border-brand/20' },
  planning:  { label: 'Planning',  className: 'bg-gray-100 text-ink-3 border-gray-200'  },
};

function MeetingTypeBadge({ type }: { type?: string }) {
  if (!type || type === 'general' || !MEETING_TYPE_STYLES[type]) return null;
  const { label, className } = MEETING_TYPE_STYLES[type];
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${className}`}>{label}</span>;
}

// ── Stop Bot Confirmation ─────────────────────────────────────

function StopBotConfirm({ onConfirm, onCancel, stopping }: {
  onConfirm: () => void; onCancel: () => void; stopping: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold text-ink mb-1">Stop recording?</h3>
        <p className="text-[13px] text-ink-4 mb-5">
          This will stop the Notemind bot from the call. Transcript and summary generation will continue.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 text-ink-2 rounded-xl text-[13px] font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={stopping}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50"
          >
            {stopping ? 'Stopping…' : 'Stop bot'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Share Modal ───────────────────────────────────────────────

function ShareModal({ link, onClose }: { link: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl p-6"
      >
        <h3 id="share-modal-title" className="text-[15px] font-semibold text-ink mb-1">Share Insights</h3>
        <p className="text-[13px] text-ink-4 mb-5">
          Anyone with this link can view the meeting summary and action items. The transcript stays private.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={link}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-ink-2 focus:outline-none"
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-lg text-[13px] font-medium hover:bg-brand-mid transition-colors shrink-0"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-gray-100 text-ink-2 rounded-lg text-[13px] font-medium hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Right panel timeline tab ──────────────────────────────────

function TimelineTab({ intelligence }: { intelligence: MeetingIntelligence | null }) {
  if (!intelligence?.timeline?.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-ink-4 gap-3 p-4">
        <Clock size={26} className="opacity-20" />
        <p className="text-[13px] text-center">Timeline available after the meeting ends</p>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full bg-white">
      {intelligence.timeline.map((ev, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="text-[11px] font-mono text-ink-4 w-14 shrink-0 pt-0.5">{ev.time}</div>
          <div className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <p className="text-[13px] text-ink-2 leading-relaxed">{ev.event}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

type RightTab = 'chat' | 'timeline';
type MobilePanel = 'transcript' | 'summary' | 'chat';

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [intelligence, setIntelligence] = useState<MeetingIntelligence | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('chat');
  const [stopping, setStopping] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('transcript');

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const toggleItem = (i: number) => setCheckedItems(prev => {
    const next = new Set(prev);
    if (next.has(i)) { next.delete(i); } else { next.add(i); }
    return next;
  });

  const fetchIntelligence = useCallback(async () => {
    try {
      const data = await api.get<MeetingIntelligence>(`/meetings/${id}/summary`);
      if (data) setIntelligence(data);
    } catch { /* silent */ }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        const m = await api.get<Meeting>(`/meetings/${id}`);
        setMeeting(m);
        if (ENDED_STATUSES.has(m.status)) await fetchIntelligence();
      } catch (err) {
        setPageError(err instanceof APIError ? err.message : 'Meeting not found.');
      }
    };
    load();
  }, [id, fetchIntelligence]);

  const { segments, status, connectionState } = useMeetingStream({
    meetingId: id,
    initialStatus: meeting?.status ?? 'pending',
    onEnded: () => { setTimeout(fetchIntelligence, 2500); },
  });

  const isLive = LIVE_STATUSES.has(status);

  // Layout states for Desktop Panel collapsing
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(isLive);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  // Sync left sidebar with live changes
  useEffect(() => {
    setIsLeftSidebarCollapsed(isLive);
  }, [isLive]);

  const stopBot = async () => {
    setStopping(true);
    try { await api.delete(`/meetings/${id}/bot`); }
    catch (err) { console.error('Stop bot failed:', err instanceof APIError ? err.message : err); }
    finally { setStopping(false); setShowStopConfirm(false); }
  };

  const generateShareLink = async () => {
    if (shareToken) {
      const link = `${window.location.origin}/share/${shareToken}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link);
      return;
    }
    try {
      const data = await api.post<ShareMeetingResponse>(`/meetings/${id}/share`, {});
      if (data?.share_token) {
        setShareToken(data.share_token);
        setShareLink(`${window.location.origin}/share/${data.share_token}`);
      }
    } catch { /* silent */ }
  };

  const downloadTranscript = () => {
    if (!segments.length) return;
    const text = segments.map(s => `[${s.speaker}]: ${s.text}`).join('\n');
    const header = `Meeting: ${meeting?.title || id}\nDate: ${meeting ? new Date(meeting.created_at).toLocaleString() : ''}\n\n`;
    const blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notemind-transcript-${id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <StopCircle size={22} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-[18px] font-semibold text-ink mb-1">Meeting not found</h2>
          <p className="text-[14px] text-ink-4">{pageError}</p>
        </div>
        <button onClick={() => router.push('/dashboard')}
          className="px-5 py-2.5 bg-gray-100 border border-gray-200 text-ink-2 rounded-xl text-[13px] font-medium hover:bg-gray-200 transition-colors">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const MOBILE_TABS: { id: MobilePanel; label: string; icon: React.ElementType }[] = [
    { id: 'transcript', label: 'Transcript', icon: AlignLeft },
    { id: 'summary',    label: 'Summary',    icon: Brain },
    { id: 'chat',       label: 'AI Chat',    icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3.5 flex-wrap gap-y-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-[13px] text-ink-4 hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} /> Meetings
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-[14px] font-semibold text-ink truncate">
              {meeting?.title ?? meeting?.meeting_url?.replace('https://', '') ?? 'Meeting'}
            </h1>
            <StatusBadge status={status} />
            <MeetingTypeBadge type={meeting?.meeting_type} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download transcript */}
            {segments.length > 0 && (
              <button
                onClick={downloadTranscript}
                aria-label="Download transcript"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-ink-2 rounded-lg text-[12px] font-medium hover:bg-gray-200 transition-colors"
              >
                <Download size={12} /> Export
              </button>
            )}

            {isLive && (
              <button
                onClick={() => setShowStopConfirm(true)}
                disabled={stopping}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[12px] font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <StopCircle size={12} />
                Stop Bot
              </button>
            )}

            <button
              onClick={generateShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-ink-2 rounded-lg text-[12px] font-medium hover:bg-gray-200 transition-colors"
            >
              <Share2 size={12} />
              {shareToken ? 'Copy link' : 'Share'}
            </button>

            {/* Sidebar toggle buttons */}
            <div className="w-px h-4 bg-gray-200 mx-1 hidden lg:block" />

            <button
              onClick={() => setIsLeftSidebarCollapsed(v => !v)}
              className={cn(
                "p-1.5 rounded-lg border border-gray-200 transition-colors hover:bg-gray-100 text-ink-4 hover:text-ink-2 hidden lg:block",
                !isLeftSidebarCollapsed && "bg-brand-light text-brand border-brand/20 hover:bg-brand/10 hover:text-brand"
              )}
              title={isLive ? "Toggle AI Insights Panel" : "Toggle Transcript Reference Panel"}
            >
              {isLive ? <Sparkles size={14} /> : <AlignLeft size={14} />}
            </button>

            <button
              onClick={() => setIsRightSidebarCollapsed(v => !v)}
              className={cn(
                "p-1.5 rounded-lg border border-gray-200 transition-colors hover:bg-gray-100 text-ink-4 hover:text-ink-2 hidden lg:block",
                !isRightSidebarCollapsed && "bg-brand-light text-brand border-brand/20 hover:bg-brand/10 hover:text-brand"
              )}
              title="Toggle AI Chat Panel"
            >
              <MessageSquare size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tab nav */}
      <div className="lg:hidden shrink-0 flex border-b border-gray-100 bg-white">
        {MOBILE_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setMobilePanel(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium transition-colors border-b-2 ${
                mobilePanel === tab.id ? 'border-brand text-brand' : 'border-transparent text-ink-4'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3-Panel Body (desktop & mobile) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden lg:flex h-full bg-off-white">
          
          {/* LEFT SIDEBAR: Insights (live) or Transcript (completed) */}
          <AnimatePresence initial={false}>
            {!isLeftSidebarCollapsed && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="shrink-0 flex flex-col overflow-hidden border-r border-gray-200 bg-white h-full"
              >
                {isLive ? (
                  <InsightsPanel
                    intelligence={intelligence}
                    isLive={isLive}
                    meetingType={meeting?.meeting_type}
                    checkedItems={checkedItems}
                    onToggleItem={toggleItem}
                    className="flex-1"
                  />
                ) : (
                  <TranscriptPanel
                    segments={segments}
                    status={status}
                    connectionState={connectionState}
                    className="flex-1"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CENTER PANEL: Transcript (live) or Insights (completed) */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 bg-white h-full">
            {isLive ? (
              <TranscriptPanel
                segments={segments}
                status={status}
                connectionState={connectionState}
                className="flex-1"
              />
            ) : (
              <InsightsPanel
                intelligence={intelligence}
                isLive={isLive}
                meetingType={meeting?.meeting_type}
                checkedItems={checkedItems}
                onToggleItem={toggleItem}
                className="flex-1"
              />
            )}
          </div>

          {/* RIGHT SIDEBAR: AI Chat / Timeline */}
          <AnimatePresence initial={false}>
            {!isRightSidebarCollapsed && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="shrink-0 flex flex-col overflow-hidden bg-white h-full"
              >
                <div className="shrink-0 flex gap-1 px-3 py-2.5 border-b border-gray-200 bg-white">
                  {(['chat', 'timeline'] as RightTab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setRightTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all capitalize ${
                        rightTab === tab
                          ? 'bg-brand-light text-brand border border-brand/20'
                          : 'text-ink-4 hover:text-ink-2 hover:bg-off-white'
                      }`}
                    >
                      {tab === 'chat' ? <MessageSquare size={12} /> : <Clock size={12} />}
                      {tab === 'chat' ? 'AI Chat' : 'Timeline'}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-hidden">
                  {rightTab === 'chat' && <AIChatPanel meetingId={id} className="h-full" />}
                  {rightTab === 'timeline' && <TimelineTab intelligence={intelligence} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Mobile: single panel based on tab selection */}
        <div className="lg:hidden h-full">
          {mobilePanel === 'transcript' && (
            <TranscriptPanel segments={segments} status={status} connectionState={connectionState} className="h-full" />
          )}
          {mobilePanel === 'summary' && (
            <InsightsPanel
              intelligence={intelligence}
              isLive={isLive}
              meetingType={meeting?.meeting_type}
              checkedItems={checkedItems}
              onToggleItem={toggleItem}
              className="h-full"
            />
          )}
          {mobilePanel === 'chat' && (
            <AIChatPanel meetingId={id} className="h-full" />
          )}
        </div>
      </div>

      {/* Stop bot confirm */}
      {showStopConfirm && (
        <StopBotConfirm
          onConfirm={stopBot}
          onCancel={() => setShowStopConfirm(false)}
          stopping={stopping}
        />
      )}

      {/* Share modal */}
      <AnimatePresence>
        {shareLink && <ShareModal link={shareLink} onClose={() => setShareLink(null)} />}
      </AnimatePresence>
    </div>
  );
}
