// Panel — canonical surface primitive for all content panels

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'inset' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = {
  none: '',
  sm:   'p-4',
  md:   'p-5 lg:p-6',
  lg:   'p-6 lg:p-8',
};

const VARIANTS = {
  default: 'bg-white border border-gray-100 shadow-sm',
  inset:   'bg-gray-50 border border-gray-200',
  flat:    'bg-white border border-gray-100',
};

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-2xl', VARIANTS[variant], PADDING[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Panel.displayName = 'Panel';

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
        {icon && <div className="text-brand shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
