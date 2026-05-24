'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Share2, StopCircle, Users, Clock,
  CheckCircle2, FileText, Target, Mic, Brain, Copy, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { api, APIError } from '@/lib/api';
import type { Meeting, MeetingIntelligence, ShareMeetingResponse } from '@/types/api';
import { useMeetingStream, LIVE_STATUSES, ENDED_STATUSES } from '@/features/meetings/hooks/useMeetingStream';
import { TranscriptPanel } from '@/features/meetings/components/TranscriptPanel';
import { AIChatPanel } from '@/features/meetings/components/AIChatPanel';
import { StatusBadge } from '@/components/ui/status-badge';

// ── Meeting type badge ────────────────────────────────────────

const MEETING_TYPE_STYLES: Record<string, { label: string; className: string }> = {
  standup:   { label: 'Standup',   className: 'bg-orange-50 text-orange-600 border-orange-200' },
  interview: { label: 'Interview', className: 'bg-purple-50 text-purple-600 border-purple-200' },
  sales:     { label: 'Sales',     className: 'bg-blue-50 text-blue-600 border-blue-200'       },
  planning:  { label: 'Planning',  className: 'bg-teal-50 text-teal-600 border-teal-200'       },
};

function MeetingTypeBadge({ type }: { type?: string }) {
  if (!type || type === 'general' || !MEETING_TYPE_STYLES[type]) return null;
  const { label, className } = MEETING_TYPE_STYLES[type];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${className}`}>
      {label}
    </span>
  );
}

// ── Avatar colors ─────────────────────────────────────────────

const AVATAR_COLORS = ['bg-green-600', 'bg-teal-600', 'bg-blue-600', 'bg-purple-600', 'bg-orange-500', 'bg-red-500'];
function hashColor(name: string) { return AVATAR_COLORS[name.length % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2); }

// ── Share Modal ───────────────────────────────────────────────

function ShareModal({ link, onClose }: { link: string; onClose: () => void }) {
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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl p-6"
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">Share Insights</h3>
        <p className="text-sm text-gray-500 mb-5">
          Anyone with this link can view the meeting summary and action items. The transcript stays private.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={link}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <button onClick={copy}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shrink-0">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button onClick={onClose}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── AI Insights Panel ─────────────────────────────────────────

type InsightTab = 'summary' | 'key_points' | 'decisions' | 'action_items' | 'participants';

const INSIGHT_TABS: { id: InsightTab; label: string; icon: React.ElementType }[] = [
  { id: 'summary',      label: 'Summary',      icon: FileText    },
  { id: 'key_points',   label: 'Key Points',   icon: Target      },
  { id: 'decisions',    label: 'Decisions',    icon: CheckCircle2 },
  { id: 'action_items', label: 'Actions',      icon: CheckCircle2 },
  { id: 'participants', label: 'People',       icon: Users        },
];

function InsightsPanel({
  intelligence,
  isLive,
  meetingType,
  className,
}: {
  intelligence: MeetingIntelligence | null;
  isLive: boolean;
  meetingType?: string;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<InsightTab>('summary');

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-100 ${className ?? ''}`}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Brain size={15} className="text-green-600" />
        <h2 className="text-sm font-semibold text-gray-900">AI Insights</h2>
        {isLive && !intelligence && (
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Analyzing
          </span>
        )}
      </div>

      {!intelligence ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 px-6 gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            {isLive
              ? <Brain size={20} className="text-green-500 animate-pulse" />
              : <FileText size={20} className="text-gray-300" />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isLive ? 'Generating insights...' : 'No insights available'}
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {isLive ? 'Summaries appear when the meeting ends.' : 'AI processing may still be in progress.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="shrink-0 px-4 pt-3 pb-0 flex gap-1 overflow-x-auto scrollbar-hide">
            {INSIGHT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tab.id === 'action_items' && intelligence.action_items?.length > 0 && (
                  <span className="ml-1 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full">
                    {intelligence.action_items.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {activeTab === 'summary' && (
              <p className="text-sm text-gray-700 leading-relaxed">
                {intelligence.summary || 'No summary generated.'}
              </p>
            )}

            {activeTab === 'key_points' && (
              <ul className="space-y-3">
                {(intelligence.key_points ?? []).map((kp, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={12} className="text-green-600" />
                    </div>
                    <span className="leading-relaxed">{kp}</span>
                  </li>
                ))}
                {(!intelligence.key_points?.length) && (
                  <p className="text-sm text-gray-400 italic">No key points extracted.</p>
                )}
              </ul>
            )}

            {activeTab === 'decisions' && (
              <div className="space-y-3">
                {(intelligence.decisions ?? []).map((dec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-green-100 bg-green-50">
                    <CheckCircle2 size={15} className="text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-800 leading-snug">{dec}</p>
                  </div>
                ))}
                {(!intelligence.decisions?.length) && (
                  <p className="text-sm text-gray-400 italic">No decisions recorded.</p>
                )}
              </div>
            )}

            {activeTab === 'action_items' && (
              <div className="space-y-2.5">
                {(intelligence.action_items ?? []).map((item, i) => (
                  <div key={i} className="flex gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50 group hover:border-gray-200 transition-colors">
                    <div className="w-4 h-4 rounded border-2 border-gray-300 mt-0.5 shrink-0 group-hover:border-green-400 transition-colors" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{item.task}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {item.owner && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Users size={10} /> {item.owner}
                          </span>
                        )}
                        {item.deadline && (
                          <span className="text-xs text-gray-400">{item.deadline}</span>
                        )}
                        {item.priority && (
                          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                            item.priority === 'high' ? 'bg-red-50 text-red-600' :
                            item.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-green-50 text-green-600'
                          }`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!intelligence.action_items?.length) && (
                  <p className="text-sm text-gray-400 italic">No action items extracted.</p>
                )}
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="space-y-2.5">
                {(intelligence.participants ?? []).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${hashColor(p)}`}>
                      {initials(p)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 flex-1 truncate">{p}</span>
                  </div>
                ))}
                {(!intelligence.participants?.length) && (
                  <p className="text-sm text-gray-400 italic">No participants detected.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Right panel tabs ──────────────────────────────────────────

type RightTab = 'chat' | 'participants' | 'timeline';

function ParticipantsTab({ intelligence, status }: { intelligence: MeetingIntelligence | null; status: string }) {
  const liveStatuses = new Set(['joining', 'waiting_for_admission', 'admitted', 'recording']);
  if (!intelligence?.participants?.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 p-4">
        <Users size={28} className="opacity-20" />
        <p className="text-sm text-center">
          {liveStatuses.has(status) ? 'Participants appear after the meeting ends' : 'No participant data'}
        </p>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-2 overflow-y-auto h-full">
      {intelligence.participants.map((p, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${hashColor(p)}`}>
            {initials(p)}
          </div>
          <span className="text-sm font-medium text-gray-900 flex-1 truncate">{p}</span>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ intelligence }: { intelligence: MeetingIntelligence | null }) {
  if (!intelligence?.timeline?.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 p-4">
        <Clock size={28} className="opacity-20" />
        <p className="text-sm text-center">Timeline available after the meeting ends</p>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      {intelligence.timeline.map((ev, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="text-xs font-mono text-gray-400 w-16 shrink-0 pt-0.5">{ev.time}</div>
          <div className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <p className="text-sm text-gray-700 leading-relaxed">{ev.event}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [intelligence, setIntelligence] = useState<MeetingIntelligence | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('chat');
  const [stopping, setStopping] = useState(false);

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
    finally { setStopping(false); }
  };

  const generateShareLink = async () => {
    try {
      const data = await api.post<ShareMeetingResponse>(`/meetings/${id}/share`, {});
      if (data?.share_token)
        setShareLink(`${window.location.origin}/share/${data.share_token}`);
    } catch { /* silent */ }
  };

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <StopCircle size={24} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Meeting not found</h2>
          <p className="text-sm text-gray-500">{pageError}</p>
        </div>
        <button onClick={() => router.push('/dashboard')}
          className="px-5 py-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const RIGHT_TABS: { id: RightTab; label: string; icon?: React.ElementType }[] = [
    { id: 'chat', label: 'AI Chat' },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4 px-5 py-3.5">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={15} /> Meetings
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {meeting?.title ?? meeting?.meeting_url?.replace('https://', '') ?? 'Meeting'}
            </h1>
            <StatusBadge status={status} />
            <MeetingTypeBadge type={meeting?.meeting_type} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLive && (
              <button onClick={stopBot} disabled={stopping}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50">
                <StopCircle size={13} />
                {stopping ? 'Stopping…' : 'Stop Bot'}
              </button>
            )}
            <button onClick={generateShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
              <Share2 size={13} />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* ── 3-Panel Body ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

        {/* Left: Transcript */}
        <div className="flex-1 lg:w-[300px] lg:flex-none flex flex-col overflow-hidden border-r border-gray-100">
          <TranscriptPanel
            segments={segments}
            status={status}
            connectionState={connectionState}
            className="flex-1"
          />
        </div>

        {/* Center: AI Insights */}
        <div className="flex-1 lg:flex-[1.4] flex flex-col overflow-hidden border-r border-gray-100">
          <InsightsPanel
            intelligence={intelligence}
            isLive={isLive}
            meetingType={meeting?.meeting_type}
            className="flex-1"
          />
        </div>

        {/* Right: AI Chat + Participants + Timeline */}
        <div className="flex-1 lg:w-[300px] lg:flex-none flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="shrink-0 flex gap-1 px-3 py-2.5 border-b border-gray-100 bg-white">
            {RIGHT_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    rightTab === tab.id
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {Icon && <Icon size={12} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === 'chat' && <AIChatPanel meetingId={id} className="h-full" />}
            {rightTab === 'participants' && <ParticipantsTab intelligence={intelligence} status={status} />}
            {rightTab === 'timeline' && <TimelineTab intelligence={intelligence} />}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareLink && <ShareModal link={shareLink} onClose={() => setShareLink(null)} />}
      </AnimatePresence>
    </div>
  );
}
