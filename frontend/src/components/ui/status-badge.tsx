// StatusBadge — canonical meeting status badge component
// Single source of truth: no duplicated status color logic

import { cn } from '@/lib/utils';
import type { MeetingStatus } from '@/types/api';

const STATUS_CONFIG: Record<
  MeetingStatus,
  { bg: string; text: string; dot: string; label: string; pulse: boolean }
> = {
  pending:               { bg: 'bg-brand-light',  text: 'text-brand',    dot: 'bg-brand',      label: 'Pending',      pulse: false },
  joining:               { bg: 'bg-brand-light',  text: 'text-brand',    dot: 'bg-brand',      label: 'Joining',      pulse: true  },
  waiting_for_admission: { bg: 'bg-gray-100',     text: 'text-ink-3',    dot: 'bg-ink-4',      label: 'Waiting',      pulse: true  },
  admitted:              { bg: 'bg-brand-light',  text: 'text-brand',    dot: 'bg-brand',      label: 'Admitted',     pulse: true  },
  recording:             { bg: 'bg-red-50',       text: 'text-red-600',  dot: 'bg-red-500',    label: 'Live',         pulse: true  },
  processing:            { bg: 'bg-brand-light',  text: 'text-brand',    dot: 'bg-brand',      label: 'Processing',   pulse: true  },
  completed:             { bg: 'bg-gray-100',     text: 'text-ink-4',    dot: 'bg-ink-5',      label: 'Completed',    pulse: false },
  failed:                { bg: 'bg-red-50',       text: 'text-red-600',  dot: 'bg-red-500',    label: 'Failed',       pulse: false },
  denied:                { bg: 'bg-red-50',       text: 'text-red-600',  dot: 'bg-red-500',    label: 'Denied',       pulse: false },
  disconnected:          { bg: 'bg-gray-100',     text: 'text-ink-4',    dot: 'bg-ink-5',      label: 'Disconnected', pulse: false },
  ended:                 { bg: 'bg-gray-100',     text: 'text-ink-5',    dot: 'bg-ink-6',      label: 'Ended',        pulse: false },
};

interface StatusBadgeProps {
  status: MeetingStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.ended;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        config.bg,
        config.text,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          config.dot,
          config.pulse && 'animate-pulse'
        )}
      />
      {config.label}
    </span>
  );
}

export function isLiveStatus(status: MeetingStatus): boolean {
  return ['joining', 'waiting_for_admission', 'admitted', 'recording', 'reconnecting'].includes(status);
}

export function isEndedStatus(status: MeetingStatus): boolean {
  return ['completed', 'failed', 'denied', 'disconnected', 'ended'].includes(status);
}
