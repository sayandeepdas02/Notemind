'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Video, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

import { api, APIError } from '@/lib/api';
import type { Meeting, MeetingJoinResponse } from '@/types/api';
import { StatusBadge } from '@/components/ui/status-badge';
import { MeetingCardSkeleton } from '@/components/ui/skeleton';
import { Panel } from '@/components/ui/panel';

// ── Meeting Card ──────────────────────────────────────────────

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const label = meeting.title
    ?? meeting.meeting_url?.replace('https://', '')
    ?? 'Uploaded Recording';

  return (
    <Link href={`/dashboard/meetings/${meeting.id}`} className="group block">
      <Panel
        variant="default"
        padding="none"
        className="p-5 hover:border-accent/40 hover:-translate-y-px transition-all duration-200 hover:shadow-md hover:shadow-accent/5"
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <StatusBadge status={meeting.status} />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-surface-3 px-2 py-1 rounded-md border border-border">
            <Clock size={11} />
            {new Date(meeting.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
        <h4 className="text-sm font-medium text-foreground mb-1 truncate group-hover:text-accent transition-colors">
          {label}
        </h4>
        <p className="text-xs text-muted-foreground font-mono">
          {meeting.id.slice(0, 8)}…
        </p>
      </Panel>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function DashboardHome() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    setMeetingsError(null);
    try {
      const data = await api.get<Meeting[]>('/meetings');
      setMeetings(data ?? []);
    } catch (err) {
      setMeetingsError(
        err instanceof APIError ? err.message : 'Failed to load meetings.'
      );
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleStartMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!url.startsWith('https://meet.google.com/') && !url.startsWith('https://zoom.us/')) {
      setStartError('Please enter a valid Google Meet or Zoom URL');
      return;
    }

    setStarting(true);
    setStartError(null);

    // Optimistic: inject a placeholder meeting card immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Meeting = {
      id: optimisticId,
      workspace_id: '',
      meeting_url: url,
      status: 'joining',
      provider: url.includes('zoom') ? 'zoom' : 'google_meet',
      created_at: new Date().toISOString(),
    };
    setMeetings(prev => [optimistic, ...prev]);

    try {
      const data = await api.post<MeetingJoinResponse>('/meetings/join', {
        meeting_url: url,
      });
      router.push(`/dashboard/meetings/${data.meeting_id}`);
    } catch (err) {
      setStartError(
        err instanceof APIError ? err.message : 'Failed to start meeting bot.'
      );
      // Roll back the optimistic card
      setMeetings(prev => prev.filter(m => m.id !== optimisticId));
      setStarting(false);
    }
  };

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto space-y-10">

      {/* ── Start Meeting ────────────────────────────────────── */}
      <section>
        <Panel padding="lg" className="relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-accent opacity-[0.04] rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
              <Video size={20} className="text-accent" />
              Start a new recording
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Paste a Google Meet or Zoom link. Notemind will join, transcribe, and summarize automatically.
            </p>

            <form onSubmit={handleStartMeeting} className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); setStartError(null); }}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="flex-1 bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all disabled:opacity-50"
                required
                disabled={starting}
              />
              <button
                type="submit"
                disabled={starting || !url.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {starting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
                {starting ? 'Dispatching…' : 'Start Notemind'}
              </button>
            </form>

            {startError && (
              <p className="mt-3 text-sm text-red-400 flex items-center gap-1.5">
                <AlertCircle size={14} /> {startError}
              </p>
            )}
          </div>
        </Panel>
      </section>

      {/* ── Meetings List ─────────────────────────────────────── */}
      <section id="meetings">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-foreground">Recent Meetings</h3>
          {!loadingMeetings && meetings.length > 0 && (
            <span className="text-xs text-muted-foreground">{meetings.length} total</span>
          )}
        </div>

        {/* Skeleton loading */}
        {loadingMeetings && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <MeetingCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {meetingsError && (
          <div className="flex items-center justify-between gap-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle size={18} />
              <span>{meetingsError}</span>
            </div>
            <button
              onClick={fetchMeetings}
              className="text-xs font-semibold underline underline-offset-2 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loadingMeetings && !meetingsError && meetings.length === 0 && (
          <div className="border border-dashed border-border rounded-2xl p-14 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-5">
              <Calendar size={22} className="text-muted-foreground" />
            </div>
            <h4 className="text-base font-semibold text-foreground mb-2">No meetings yet</h4>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Paste a meeting link above to get started. Notemind will join and handle the rest.
            </p>
          </div>
        )}

        {/* Meeting grid */}
        {!loadingMeetings && meetings.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04 } },
            }}
          >
            {meetings.map(m => (
              <motion.div
                key={m.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <MeetingCard meeting={m} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
