import { Skeleton, SkeletonCard } from "@/components/Skeleton";

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

      {/* Quick Stats */}
      <div className="mb-5 flex gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-20 flex-1" />
        ))}
      </div>

      {/* Rank Card */}
      <SkeletonCard className="mb-5 h-16" />

      {/* CTA */}
      <Skeleton className="mb-5 h-14 rounded-xl" />

      {/* Activity Feed */}
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
