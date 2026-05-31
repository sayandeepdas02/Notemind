'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Play, Video, Clock, Loader2, AlertCircle, ArrowRight,
  Upload, Calendar, Search, RefreshCw,
} from 'lucide-react';

import { api, APIError } from '@/lib/api';
import type { Meeting, MeetingJoinResponse, MeetingProvider } from '@/types/api';
import { StatusBadge } from '@/components/ui/status-badge';
import { MeetingCardSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────

function parseMeetTitle(meeting: Meeting): string {
  if (meeting.title) return meeting.title;
  if (meeting.meeting_url) {
    if (meeting.meeting_url.includes('meet.google.com')) {
      const match = meeting.meeting_url.match(/meet\.google\.com\/([a-z0-9-]+)/i);
      if (match) return `Meet: ${match[1]}`;
    }
    if (meeting.meeting_url.includes('zoom.us')) return 'Zoom meeting';
  }
  if (meeting.provider === 'upload') return 'Uploaded Recording';
  return 'Untitled Meeting';
}

function formatDuration(seconds?: number | null, status?: string): string | null {
  if (seconds == null) {
    if (status && ['recording', 'admitted', 'joining', 'waiting_for_admission'].includes(status))
      return 'In progress';
    return null;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function relativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  if (date >= todayStart) return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  if (date >= yesterdayStart) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Provider badge ────────────────────────────────────────────

const PROVIDER_STYLES: Record<MeetingProvider, { label: string; className: string }> = {
  google_meet: { label: 'Google Meet', className: 'bg-brand-light text-brand border-brand/20' },
  zoom:        { label: 'Zoom',        className: 'bg-blue-50 text-blue-700 border-blue-200'  },
  upload:      { label: 'Uploaded',    className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function ProviderBadge({ provider }: { provider: MeetingProvider }) {
  const config = PROVIDER_STYLES[provider] ?? PROVIDER_STYLES.upload;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', config.className)}>
      <Video size={10} className="shrink-0" />
      {config.label}
    </span>
  );
}

// ── Sort / filter ─────────────────────────────────────────────

type FilterMode = 'all' | 'live' | 'completed' | 'uploaded';

function filterMeetings(meetings: Meeting[], mode: FilterMode): Meeting[] {
  if (mode === 'live') return meetings.filter(m => ['joining','waiting_for_admission','admitted','recording'].includes(m.status));
  if (mode === 'completed') return meetings.filter(m => ['completed','ended'].includes(m.status));
  if (mode === 'uploaded') return meetings.filter(m => m.provider === 'upload');
  return meetings;
}

// ── Meeting Card ──────────────────────────────────────────────

function MeetingCard({ meeting, index }: { meeting: Meeting; index: number }) {
  const title = parseMeetTitle(meeting);
  const duration = formatDuration(meeting.duration_seconds, meeting.status);
  const isCompleted = ['completed', 'ended'].includes(meeting.status);
  const hasSummary = isCompleted && (meeting as any).summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link href={`/dashboard/meetings/${meeting.id}`} className="group block">
        <div className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 hover:shadow-sm hover:-translate-y-px transition-all duration-200">
          <div className="flex items-center justify-between mb-3 gap-2">
            <ProviderBadge provider={meeting.provider} />
            <StatusBadge status={meeting.status} />
          </div>

          <h4 className="text-[15px] font-medium text-ink mb-2 truncate group-hover:text-brand transition-colors flex items-center gap-1.5">
            {title}
            <ArrowRight size={13} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0 text-brand" />
          </h4>

          <div className="flex items-center gap-4 text-[12px] text-ink-5 mb-3">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {relativeDate(meeting.created_at)}
            </span>
            {duration && (
              <span className="flex items-center gap-1">
                <Video size={11} />
                {duration}
              </span>
            )}
          </div>

          {/* Only show summary preview if summary actually exists */}
          {hasSummary && (
            <div className="bg-brand-pale rounded-lg px-3 py-2 mt-2 border border-brand-light">
              <p className="text-[13px] text-ink-3 line-clamp-2 leading-relaxed">
                {(meeting as any).summary}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <p className="text-[11px] text-ink-5 uppercase tracking-wider">
              {meeting.meeting_type || 'General'}
            </p>
            <span className="text-[12px] text-brand font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Join Form ─────────────────────────────────────────────────

const MEETING_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'standup', label: 'Standup' },
  { value: 'interview', label: 'Interview' },
  { value: 'sales', label: 'Sales' },
  { value: 'planning', label: 'Planning' },
];

function JoinForm({ onJoined }: { onJoined: (id: string) => void }) {
  const [url, setUrl] = useState('');
  const [meetingType, setMeetingType] = useState('general');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (!url.startsWith('https://meet.google.com/') && !url.startsWith('https://zoom.us/')) {
      setError('Please enter a valid Google Meet or Zoom URL');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const data = await api.post<MeetingJoinResponse>('/meetings/join', { meeting_url: url, meeting_type: meetingType });
      onJoined(data.meeting_id);
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to start meeting bot.');
      setStarting(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 bg-brand hover:bg-brand-mid text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <Play size={13} fill="currentColor" />
        Join a meeting
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-ink">Join a meeting</h3>
        <button
          aria-label="Close join form"
          onClick={() => setShowForm(false)}
          className="text-ink-4 hover:text-ink-2 transition-colors text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <form onSubmit={handleStart} className="space-y-3">
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(null); }}
          placeholder="Paste Google Meet or Zoom link..."
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-5
                     focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
          required
          disabled={starting}
          autoFocus
        />

        <div className="flex items-center gap-1.5 flex-wrap">
          {MEETING_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              disabled={starting}
              onClick={() => setMeetingType(t.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border',
                meetingType === t.value
                  ? 'bg-brand text-white border-brand'
                  : 'bg-gray-50 text-ink-3 border-gray-200 hover:text-ink hover:bg-gray-100'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-[13px] text-red-600 flex items-center gap-1.5">
            <AlertCircle size={13} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={starting || !url.trim()}
          className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-mid text-white rounded-lg font-medium text-[14px] py-2.5 transition-colors disabled:opacity-50"
        >
          {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
          {starting ? 'Joining...' : 'Join now →'}
        </button>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function DashboardHome() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');

  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    setMeetingsError(null);
    try {
      const data = await api.get<Meeting[]>('/meetings');
      const sorted = (data ?? []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setMeetings(sorted);
    } catch (err) {
      setMeetingsError(err instanceof APIError ? err.message : 'Failed to load meetings.');
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleJoined = (id: string) => router.push(`/dashboard/meetings/${id}`);

  const filtered = filterMeetings(meetings, filter);
  const liveCount = meetings.filter(m => ['recording','admitted','joining'].includes(m.status)).length;

  const FILTER_TABS: { id: FilterMode; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'live', label: 'Live' },
    { id: 'completed', label: 'Completed' },
    { id: 'uploaded', label: 'Uploaded' },
  ];

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold text-ink">Meetings</h1>
        <JoinForm onJoined={handleJoined} />
      </div>

      {/* Quick stats */}
      {!loadingMeetings && meetings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: meetings.length },
            { label: 'Completed', value: meetings.filter(m => ['completed','ended'].includes(m.status)).length },
            { label: 'Live now', value: liveCount },
            { label: 'This week', value: meetings.filter(m => Date.now() - new Date(m.created_at).getTime() < 7 * 86400000).length },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-[24px] font-semibold text-ink">{stat.value}</p>
              <p className="text-[12px] text-ink-5 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Meeting list */}
      <section id="meetings">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-5">Recent meetings</h2>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors flex items-center gap-1.5',
                    filter === tab.id
                      ? 'bg-white text-ink shadow-sm border border-gray-200'
                      : 'text-ink-4 hover:text-ink-2'
                  )}
                >
                  {tab.label}
                  {tab.id === 'live' && liveCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {liveCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={fetchMeetings}
              disabled={loadingMeetings}
              aria-label="Refresh meetings"
              className="p-2 text-ink-4 hover:text-ink-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={loadingMeetings ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Skeletons */}
        {loadingMeetings && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <MeetingCardSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {meetingsError && (
          <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            <div className="flex items-center gap-3 text-[13px]">
              <AlertCircle size={16} />
              <span>{meetingsError}</span>
            </div>
            <button onClick={fetchMeetings} className="text-[12px] font-semibold underline underline-offset-2 shrink-0">
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loadingMeetings && !meetingsError && meetings.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mx-auto mb-5">
              <Calendar size={26} className="text-brand" />
            </div>
            <h3 className="text-[16px] font-semibold text-ink mb-2">No meetings yet</h3>
            <p className="text-[14px] text-ink-4 max-w-xs mx-auto mb-8">
              Join a live meeting, connect your calendar, or upload a recording to get started.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => {/* trigger join form */}}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl text-[13px] font-medium hover:bg-brand-mid transition-colors"
              >
                <Play size={14} fill="currentColor" /> Join a meeting
              </button>
              <Link href="/dashboard/calendar"
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-ink-2 rounded-xl text-[13px] font-medium hover:bg-off-white transition-colors">
                <Calendar size={14} /> Connect Calendar
              </Link>
              <Link href="/dashboard/upload"
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-ink-2 rounded-xl text-[13px] font-medium hover:bg-off-white transition-colors">
                <Upload size={14} /> Upload Recording
              </Link>
            </div>
          </div>
        )}

        {/* No filter results */}
        {!loadingMeetings && !meetingsError && meetings.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <Search size={26} className="text-ink-5 mx-auto mb-3" />
            <p className="text-ink-4 text-[14px]">No {filter} meetings found.</p>
          </div>
        )}

        {/* Meeting grid */}
        {!loadingMeetings && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((m, i) => (
              <MeetingCard key={m.id} meeting={m} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
