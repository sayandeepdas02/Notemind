'use client';

// InsightsPanel — post-meeting AI intelligence renderer
// Displays streaming-ready structured summaries, decisions, and action items
// Empty state adapts to live vs. post-meeting context

import { FileText, Target, CheckCircle2, Users, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingIntelligence, ActionItem } from '@/types/api';

// ── Action Item Card ─────────────────────────────────────────

function ActionItemCard({ item }: { item: ActionItem }) {
  return (
    <div className="flex gap-3 p-3.5 rounded-xl border border-border bg-background group hover:border-accent/40 transition-colors cursor-default">
      <div className="w-4 h-4 rounded border-2 border-border mt-0.5 shrink-0 group-hover:border-accent transition-colors" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{item.task}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {item.owner && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users size={11} /> {item.owner}
            </span>
          )}
          {item.deadline && (
            <span className="text-xs text-muted-foreground">{item.deadline}</span>
          )}
          {item.priority && (
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
              item.priority === 'high' && 'bg-red-500/10 text-red-400',
              item.priority === 'medium' && 'bg-yellow-500/10 text-yellow-400',
              item.priority === 'low' && 'bg-green-500/10 text-green-400',
            )}>
              {item.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section Header ───────────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
      <Icon size={12} />
      {label}
    </h3>
  );
}

// ── Empty State ──────────────────────────────────────────────

interface InsightsEmptyProps {
  isLive: boolean;
}

function InsightsEmptyState({ isLive }: InsightsEmptyProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground px-6 gap-4">
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
        {isLive ? (
          <Sparkles size={20} className="text-accent animate-pulse" />
        ) : (
          <FileText size={20} className="text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground mb-1">
          {isLive ? 'Generating insights...' : 'No insights available'}
        </p>
        <p className="text-xs leading-relaxed">
          {isLive
            ? 'Structured summaries, decisions, and action items will appear here as soon as the meeting ends.'
            : 'AI processing may still be in progress.'}
        </p>
      </div>
      {isLive && (
        <Loader2 size={16} className="animate-spin text-accent" />
      )}
    </div>
  );
}

// ── Standup View ─────────────────────────────────────────────
// Key points from standup meetings follow "Name: Yesterday X. Today Y. Blocked Z." format.

function StandupView({ intelligence }: { intelligence: MeetingIntelligence }) {
  const yesterday = intelligence.key_points.filter(kp =>
    kp.toLowerCase().includes('yesterday') || kp.toLowerCase().includes('did ')
  );
  const today = intelligence.key_points.filter(kp =>
    kp.toLowerCase().includes('today') || kp.toLowerCase().includes('doing')
  );
  const blockers = intelligence.action_items.filter(item =>
    item.task.toLowerCase().includes('blocker') || item.task.toLowerCase().includes('blocked')
  );
  const otherItems = intelligence.action_items.filter(item =>
    !item.task.toLowerCase().includes('blocker') && !item.task.toLowerCase().includes('blocked')
  );

  // Fallback: if we can't split, show all key_points as "updates"
  const allPoints = intelligence.key_points;
  const canSplit = yesterday.length > 0 || today.length > 0;

  return (
    <div className="space-y-6">
      {intelligence.summary && (
        <div>
          <SectionHeader icon={FileText} label="Team summary" />
          <div className="bg-background border border-border rounded-xl p-4 text-sm text-foreground/80 leading-relaxed">
            {intelligence.summary}
          </div>
        </div>
      )}

      {canSplit ? (
        <>
          {yesterday.length > 0 && (
            <div>
              <SectionHeader icon={CheckCircle2} label="Yesterday" />
              <ul className="space-y-2.5">
                {yesterday.map((kp, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/80">
                    <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                    <span className="leading-relaxed">{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {today.length > 0 && (
            <div>
              <SectionHeader icon={Target} label="Today" />
              <ul className="space-y-2.5">
                {today.map((kp, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/80">
                    <span className="text-accent mt-0.5 shrink-0">›</span>
                    <span className="leading-relaxed">{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div>
          <SectionHeader icon={Target} label="Updates" />
          <ul className="space-y-2.5">
            {allPoints.map((kp, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/80">
                <span className="text-accent mt-0.5 shrink-0">›</span>
                <span className="leading-relaxed">{kp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {blockers.length > 0 && (
        <div>
          <SectionHeader icon={AlertCircle} label="Blockers" />
          <div className="space-y-2">
            {blockers.map((item, i) => (
              <ActionItemCard key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {otherItems.length > 0 && (
        <div>
          <SectionHeader icon={CheckCircle2} label={`Action items (${otherItems.length})`} />
          <div className="space-y-2">
            {otherItems.map((item, i) => (
              <ActionItemCard key={i} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

interface InsightsPanelProps {
  intelligence: MeetingIntelligence | null;
  isLive: boolean;
  meetingType?: string;
  className?: string;
}

export function InsightsPanel({ intelligence, isLive, meetingType, className }: InsightsPanelProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3.5 border-b border-border flex items-center justify-between bg-background/50">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">AI Insights</h2>
        </div>
        {isLive && !intelligence && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Analyzing
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {!intelligence ? (
          <InsightsEmptyState isLive={isLive} />
        ) : meetingType === 'standup' ? (
          <StandupView intelligence={intelligence} />
        ) : (
          <div className="space-y-8">
            {/* Executive Summary */}
            <div>
              <SectionHeader icon={FileText} label="Executive Summary" />
              <div className="bg-background border border-border rounded-xl p-4 text-sm text-foreground/80 leading-relaxed">
                {intelligence.summary || 'No summary generated.'}
              </div>
            </div>

            {/* Key Points */}
            {intelligence.key_points?.length > 0 && (
              <div>
                <SectionHeader icon={Target} label="Key Points" />
                <ul className="space-y-2.5">
                  {intelligence.key_points.map((kp, i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/80">
                      <span className="text-accent mt-0.5 shrink-0">›</span>
                      <span className="leading-relaxed">{kp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decisions */}
            {intelligence.decisions?.length > 0 && (
              <div>
                <SectionHeader icon={CheckCircle2} label="Decisions" />
                <div className="space-y-2">
                  {intelligence.decisions.map((dec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-green-500/15 bg-green-500/5"
                    >
                      <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground/90 leading-snug">{dec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {intelligence.action_items?.length > 0 && (
              <div>
                <SectionHeader icon={CheckCircle2} label={`Action Items (${intelligence.action_items.length})`} />
                <div className="space-y-2">
                  {intelligence.action_items.map((item, i) => (
                    <ActionItemCard key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Participants */}
            {intelligence.participants?.length > 0 && (
              <div>
                <SectionHeader icon={Users} label="Participants" />
                <div className="flex flex-wrap gap-2">
                  {intelligence.participants.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-3 border border-border rounded-full text-xs font-medium text-foreground"
                    >
                      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-[8px] font-bold text-white">
                        {p.charAt(0).toUpperCase()}
                      </div>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
