'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  RefreshCw,
  Users,
  Video,
  ExternalLink,
} from 'lucide-react';
import { api, APIError } from '@/lib/api';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPage, PageHeader, SectionLabel } from '@/components/dashboard/page';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── Types ─────────────────────────────────────────────────────

interface CalendarStatus {
  connected: boolean;
  last_synced?: string;
  email?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  attendee_count?: number;
  meeting_link?: string;
  meet_type?: 'google_meet' | 'zoom' | null;
}

// ── Date formatting helpers ───────────────────────────────────

function formatEventTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const dayAfterTomorrow = new Date(tomorrowStart.getTime() + 86400000);

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (date >= todayStart && date < tomorrowStart) {
    return `Today at ${timeStr}`;
  }
  if (date >= tomorrowStart && date < dayAfterTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }
  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dayStr} at ${timeStr}`;
}

function getDayGroup(isoString: string): 'today' | 'tomorrow' | 'week' {
  const now = new Date();
  const date = new Date(isoString);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const dayAfterTomorrow = new Date(tomorrowStart.getTime() + 86400000);

  if (date >= todayStart && date < tomorrowStart) return 'today';
  if (date >= tomorrowStart && date < dayAfterTomorrow) return 'tomorrow';
  return 'week';
}

function isWithin15Min(isoString: string): boolean {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = date.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= 15 * 60 * 1000;
}

function formatLastSynced(isoString?: string): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── Meeting link badge ────────────────────────────────────────

function MeetBadge({ type }: { type: 'google_meet' | 'zoom' | null | undefined }) {
  if (type === 'google_meet') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-light text-brand">
        Meet
      </span>
    );
  }
  if (type === 'zoom') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-ink-3">
        Zoom
      </span>
    );
  }
  return null;
}

// ── Event card ────────────────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const canJoin = isWithin15Min(event.start_time);
  return (
    <div className="flex items-start gap-4 rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.05)] transition-colors hover:border-slate-200">
      <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
        <CalendarDays size={18} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-ink truncate">{event.title}</h4>
          <MeetBadge type={event.meet_type} />
        </div>
        <p className="text-xs text-ink-4 mt-1">{formatEventTime(event.start_time)}</p>
        {event.attendee_count != null && event.attendee_count > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-ink-4">
            <Users size={11} />
            {event.attendee_count} attendee{event.attendee_count !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      {canJoin && event.meeting_link && (
        <a
          href={event.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-light text-brand border border-brand/20 rounded-lg text-xs font-semibold hover:bg-brand/20 transition-colors shrink-0"
        >
          <Video size={12} />
          Join now
        </a>
      )}
    </div>
  );
}

// ── Skeleton cards ────────────────────────────────────────────

function EventSkeleton() {
  return (
      <div className="flex items-center gap-4 rounded-[24px] border border-white/80 bg-white/92 p-4">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

type PageState = 'loading' | 'not_connected' | 'connected_with_events' | 'connected_empty';

export default function CalendarPage() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPageState('loading');
    setError(null);
    try {
      const s = await api.get<CalendarStatus>('/calendar/status');
      setStatus(s);
      if (!s.connected) {
        setPageState('not_connected');
        return;
      }
      const ev = await api.get<CalendarEvent[]>('/calendar/events');
      const list = ev ?? [];
      setEvents(list);
      setPageState(list.length > 0 ? 'connected_with_events' : 'connected_empty');
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to load calendar');
      setPageState('not_connected');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/calendar/sync', {});
      await load();
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <DashboardPage className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <EventSkeleton />
        <EventSkeleton />
        <EventSkeleton />
      </DashboardPage>
    );
  }

  // ── Not connected ────────────────────────────────────────────
  if (pageState === 'not_connected') {
    return (
      <DashboardPage className="max-w-4xl">
        <Panel padding="lg" className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-gray-200 flex items-center justify-center mx-auto mb-5">
            <CalendarDays size={28} className="text-ink-4" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Your calendar isn&apos;t connected</h2>
          <p className="text-sm text-ink-4 mb-6 max-w-sm mx-auto">
            Connect your Google Calendar so Notemind can automatically join your scheduled meetings.
          </p>
          <ul className="text-left space-y-2 mb-8 max-w-xs mx-auto">
            {[
              'Auto-join video meetings from your calendar',
              'Get summaries delivered after every call',
              'Never miss action items from your meetings',
            ].map(b => (
              <li key={b} className="flex items-start gap-2 text-sm text-ink-4">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
          <button
            onClick={() => { window.location.href = `${API_BASE}/auth/google-calendar`; }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-mid text-white rounded-xl font-semibold transition-colors"
          >
            <CalendarDays size={18} />
            Connect Google Calendar
          </button>
        </Panel>
      </DashboardPage>
    );
  }

  // ── Group events by day ───────────────────────────────────────
  const grouped: Record<string, CalendarEvent[]> = { today: [], tomorrow: [], week: [] };
  events.forEach(ev => {
    grouped[getDayGroup(ev.start_time)].push(ev);
  });

  const groupLabels: Record<string, string> = {
    today: 'Today',
    tomorrow: 'Tomorrow',
    week: 'This week',
  };

  // ── Connected empty ──────────────────────────────────────────
  if (pageState === 'connected_empty') {
    return (
      <DashboardPage className="max-w-4xl">
        <PageHeader
          eyebrow="Calendar"
          title="Upcoming meetings"
          description={status?.last_synced ? `Last synced ${formatLastSynced(status.last_synced)}` : 'Upcoming meetings with join links from your connected calendar.'}
          action={
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              Sync now
            </button>
          }
        />
        <Panel padding="lg" className="text-center">
          <CalendarDays size={28} className="text-ink-4 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-ink-4">No upcoming meetings with video links in the next 7 days</p>
        </Panel>
      </DashboardPage>
    );
  }

  // ── Connected with events ─────────────────────────────────────
  return (
    <DashboardPage className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Calendar"
        title="Upcoming meetings"
        description={status?.last_synced ? `Last synced ${formatLastSynced(status.last_synced)}` : 'Upcoming meetings with join links from your connected calendar.'}
        action={
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync now
          </button>
        }
      />

      <div className="space-y-6">
        {(['today', 'tomorrow', 'week'] as const).map(group => {
          const items = grouped[group];
          if (!items || items.length === 0) return null;
          return (
            <div key={group}>
              <SectionLabel className="mb-3">{groupLabels[group]}</SectionLabel>
              <div className="space-y-3">
                {items.map(ev => <EventCard key={ev.id} event={ev} />)}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardPage>
  );
}
