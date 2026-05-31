'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Share2, StopCircle, Users, Clock,
  CheckCircle2, FileText, Target, Mic, Brain, Copy,
  Check, Download, AlignLeft, MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { api, APIError } from '@/lib/api';
import type { Meeting, MeetingIntelligence, ShareMeetingResponse } from '@/types/api';
import { useMeetingStream, LIVE_STATUSES, ENDED_STATUSES } from '@/features/meetings/hooks/useMeetingStream';
import { TranscriptPanel } from '@/features/meetings/components/TranscriptPanel';
import { AIChatPanel } from '@/features/meetings/components/AIChatPanel';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

// ── Meeting type badge ────────────────────────────────────────

const MEETING_TYPE_STYLES: Record<string, { label: string; className: string }> = {
  standup:   { label: 'Standup',   className: 'bg-orange-50 text-orange-600 border-orange-200' },
  interview: { label: 'Interview', className: 'bg-purple-50 text-purple-600 border-purple-200' },
  sales:     { label: 'Sales',     className: 'bg-blue-50 text-blue-700 border-blue-200'       },
  planning:  { label: 'Planning',  className: 'bg-teal-50 text-teal-700 border-teal-200'       },
};

function MeetingTypeBadge({ type }: { type?: string }) {
  if (!type || type === 'general' || !MEETING_TYPE_STYLES[type]) return null;
  const { label, className } = MEETING_TYPE_STYLES[type];
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${className}`}>{label}</span>;
}

// ── Avatar ────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-brand', 'bg-teal-600', 'bg-blue-600', 'bg-purple-600', 'bg-orange-500', 'bg-red-500'];
function hashColor(name: string) { return AVATAR_COLORS[name.length % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2); }

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

// ── AI Insights Panel ─────────────────────────────────────────

type InsightTab = 'summary' | 'key_points' | 'decisions' | 'action_items' | 'participants';

const INSIGHT_TABS: { id: InsightTab; label: string; icon: React.ElementType }[] = [
  { id: 'summary',      label: 'Summary',    icon: FileText     },
  { id: 'key_points',   label: 'Key Points', icon: Target       },
  { id: 'decisions',    label: 'Decisions',  icon: CheckCircle2 },
  { id: 'action_items', label: 'Actions',    icon: CheckCircle2 },
  { id: 'participants', label: 'People',     icon: Users        },
];

function InsightsPanel({
  intelligence, isLive, meetingType, className,
}: { intelligence: MeetingIntelligence | null; isLive: boolean; meetingType?: string; className?: string; }) {
  const [activeTab, setActiveTab] = useState<InsightTab>('summary');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleItem = (i: number) => setCheckedItems(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-100 ${className ?? ''}`}>
      <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Brain size={14} className="text-brand" />
        <h2 className="text-[13px] font-semibold text-ink">AI Insights</h2>
        {isLive && !intelligence && (
          <span className="ml-auto text-[11px] text-ink-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Analyzing
          </span>
        )}
      </div>

      {!intelligence ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-ink-4 px-6 gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center">
            {isLive
              ? <Brain size={20} className="text-brand animate-pulse" />
              : <FileText size={20} className="text-ink-5" />}
          </div>
          <div>
            <p className="text-[14px] font-medium text-ink mb-1">
              {isLive ? 'Generating insights...' : 'No insights available'}
            </p>
            <p className="text-[12px] text-ink-5 leading-relaxed">
              {isLive ? 'Summaries appear when the meeting ends.' : 'AI processing may still be in progress.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="shrink-0 px-4 pt-3 pb-0 flex gap-1 overflow-x-auto">
            {INSIGHT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-brand-light text-brand border border-brand/20'
                    : 'text-ink-4 hover:text-ink-2 hover:bg-off-white'
                }`}
              >
                {tab.label}
                {tab.id === 'action_items' && intelligence.action_items?.length > 0 && (
                  <span className="ml-1 text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full">
                    {intelligence.action_items.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {activeTab === 'summary' && (
              <p className="text-[14px] text-ink-2 leading-relaxed">{intelligence.summary || 'No summary generated.'}</p>
            )}

            {activeTab === 'key_points' && (
              <ul className="space-y-3">
                {(intelligence.key_points ?? []).map((kp, i) => (
                  <li key={i} className="flex gap-3 text-[14px] text-ink-2">
                    <div className="w-5 h-5 rounded-full bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={11} className="text-brand" />
                    </div>
                    <span className="leading-relaxed">{kp}</span>
                  </li>
                ))}
                {!intelligence.key_points?.length && <p className="text-[13px] text-ink-5 italic">No key points extracted.</p>}
              </ul>
            )}

            {activeTab === 'decisions' && (
              <div className="space-y-3">
                {(intelligence.decisions ?? []).map((dec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-light bg-brand-pale">
                    <CheckCircle2 size={14} className="text-brand mt-0.5 shrink-0" />
                    <p className="text-[13px] text-ink leading-snug">{dec}</p>
                  </div>
                ))}
                {!intelligence.decisions?.length && <p className="text-[13px] text-ink-5 italic">No decisions recorded.</p>}
              </div>
            )}

            {activeTab === 'action_items' && (
              <div className="space-y-2.5">
                {(intelligence.action_items ?? []).map((item, i) => (
                  <div key={i}
                    className={`flex gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      checkedItems.has(i) ? 'border-brand-light bg-brand-pale opacity-60' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                    onClick={() => toggleItem(i)}
                  >
                    <div className={`w-4 h-4 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                      checkedItems.has(i) ? 'bg-brand border-brand' : 'border-gray-300'
                    }`}>
                      {checkedItems.has(i) && <Check size={10} className="text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-medium leading-snug ${checkedItems.has(i) ? 'line-through text-ink-4' : 'text-ink'}`}>
                        {item.task}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {item.owner && (
                          <span className="text-[11px] text-ink-4 flex items-center gap-1">
                            <Users size={10} /> {item.owner}
                          </span>
                        )}
                        {item.deadline && <span className="text-[11px] text-ink-4">{item.deadline}</span>}
                        {item.priority && (
                          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                            item.priority === 'high' ? 'bg-red-50 text-red-600' :
                            item.priority === 'medium' ? 'bg-amber-50 text-amber-700' :
                            'bg-brand-light text-brand'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!intelligence.action_items?.length && <p className="text-[13px] text-ink-5 italic">No action items extracted.</p>}
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="space-y-2.5">
                {(intelligence.participants ?? []).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 ${hashColor(p)}`}>
                      {initials(p)}
                    </div>
                    <span className="text-[14px] font-medium text-ink flex-1 truncate">{p}</span>
                  </div>
                ))}
                {!intelligence.participants?.length && <p className="text-[13px] text-ink-5 italic">No participants detected.</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Right panel tabs ──────────────────────────────────────────

type RightTab = 'chat' | 'timeline';

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
    <div className="p-4 space-y-3 overflow-y-auto h-full">
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

// Mobile panel tab type
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

  const stopBot = async () => {
    setStopping(true);
    try { await api.delete(`/meetings/${id}/bot`); }
    catch (err) { console.error('Stop bot failed:', err instanceof APIError ? err.message : err); }
    finally { setStopping(false); setShowStopConfirm(false); }
  };

  const generateShareLink = async () => {
    // Reuse existing token if already generated
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

      {/* 3-Panel Body (desktop) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Desktop: 3 panels side by side */}
        <div className="hidden lg:flex h-full">
          <div className="w-[280px] shrink-0 flex flex-col overflow-hidden border-r border-gray-100">
            <TranscriptPanel segments={segments} status={status} connectionState={connectionState} className="flex-1" />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
            <InsightsPanel intelligence={intelligence} isLive={isLive} meetingType={meeting?.meeting_type} className="flex-1" />
          </div>

          <div className="w-[280px] shrink-0 flex flex-col overflow-hidden">
            <div className="shrink-0 flex gap-1 px-3 py-2.5 border-b border-gray-100 bg-white">
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
          </div>
        </div>

        {/* Mobile: single panel based on tab */}
        <div className="lg:hidden h-full">
          {mobilePanel === 'transcript' && (
            <TranscriptPanel segments={segments} status={status} connectionState={connectionState} className="h-full" />
          )}
          {mobilePanel === 'summary' && (
            <InsightsPanel intelligence={intelligence} isLive={isLive} meetingType={meeting?.meeting_type} className="h-full" />
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
