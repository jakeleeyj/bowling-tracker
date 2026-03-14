import { BowlingSpinner, Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Skeleton className="mb-1 h-4 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      <div className="flex flex-col items-center py-12">
        <BowlingSpinner />
        <p className="mt-3 text-sm text-text-muted">Loading...</p>
      </div>

      {/* Activity Feed skeleton */}
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
