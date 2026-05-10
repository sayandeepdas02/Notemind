// Panel — the canonical surface primitive for all content panels
// Provides consistent spacing, border, radius, and shadow behavior
// Replaces all ad-hoc bg + border + rounded combinations

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'inset' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = {
  none: '',
  sm:   'p-4',
  md:   'p-5 lg:p-6',
  lg:   'p-6 lg:p-8',
};

const VARIANTS = {
  default: 'bg-surface-2 border border-border shadow-sm',
  inset:   'bg-background border border-border shadow-inner',
  glass:   'bg-white/[0.03] border border-white/[0.07] backdrop-blur-md shadow-sm',
};

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl',
          VARIANTS[variant],
          PADDING[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Panel.displayName = 'Panel';

// PanelHeader — standardized panel header with optional title/action
interface PanelHeaderProps {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ title, description, action, icon, className }: PanelHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="text-accent shrink-0">{icon}</div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
