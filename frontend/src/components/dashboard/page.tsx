import { cn } from '@/lib/utils';

export function DashboardPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-5 py-6 lg:px-8 lg:py-8', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm leading-6 text-ink-4 sm:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-5', className)}>
      {children}
    </p>
  );
}

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-white/80 bg-white/88 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur',
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-5">{label}</p>
      <p className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-ink-4">{hint}</p>}
    </div>
  );
}
