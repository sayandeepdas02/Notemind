import { cn } from '@/lib/utils';

interface SkeletonProps { className?: string; }

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-100', className)} />
  );
}

export function MeetingCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function TranscriptSegmentSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Skeleton className="w-7 h-7 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="pl-10 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}
