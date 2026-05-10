// StatusBadge — canonical meeting status badge component
// Single source of truth: no duplicated status color logic

import { cn } from '@/lib/utils';
import type { MeetingStatus } from '@/types/api';

const STATUS_CONFIG: Record<
  MeetingStatus,
  { bg: string; text: string; dot: string; label: string; pulse: boolean }
> = {
  pending:               { bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-500',   label: 'Pending',      pulse: false },
  joining:               { bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-500',   label: 'Joining',      pulse: true  },
  waiting_for_admission: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-500', label: 'Waiting',      pulse: true  },
  admitted:              { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-500',  label: 'Admitted',     pulse: true  },
  recording:             { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-500',  label: 'Recording',    pulse: true  },
  processing:            { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500', label: 'Processing',   pulse: true  },
  completed:             { bg: 'bg-white/5',       text: 'text-zinc-400',   dot: 'bg-zinc-500',   label: 'Completed',    pulse: false },
  failed:                { bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-500',    label: 'Failed',       pulse: false },
  denied:                { bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-500',    label: 'Denied',       pulse: false },
  disconnected:          { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-500', label: 'Disconnected', pulse: false },
  ended:                 { bg: 'bg-white/5',       text: 'text-zinc-400',   dot: 'bg-zinc-500',   label: 'Ended',        pulse: false },
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
          'w-1.5 h-1.5 rounded-full',
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
