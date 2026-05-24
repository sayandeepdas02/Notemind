'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, FileText, Bot, LogOut } from 'lucide-react';
import { useNotifications, type Notification } from '@/lib/notifications';
import { cn } from '@/lib/utils';

// ── Relative time helper ──────────────────────────────────────

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

// ── Notification icon ─────────────────────────────────────────

function NotifIcon({ type }: { type: Notification['type'] }) {
  if (type === 'summary_ready') return <FileText size={14} className="text-green-600" />;
  if (type === 'bot_joined') return <Bot size={14} className="text-green-400" />;
  return <LogOut size={14} className="text-orange-400" />;
}

// ── Notification item ─────────────────────────────────────────

function NotifItem({ notif }: { notif: Notification }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-surface-3/50',
        !notif.read && 'border-l-2 border-l-blue-500'
      )}
    >
      <div className="mt-0.5 w-7 h-7 rounded-full bg-surface-3 border border-border flex items-center justify-center shrink-0">
        <NotifIcon type={notif.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{notif.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">{relativeTime(notif.timestamp)}</p>
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────

export function NotificationsPanel() {
  const { notifications, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const handleOpen = () => {
    setOpen(prev => !prev);
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-green-600 text-[10px] font-bold text-white flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-8 w-80 bg-surface-2 border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck size={12} />
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                <Bell size={24} className="opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => <NotifItem key={n.id} notif={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
