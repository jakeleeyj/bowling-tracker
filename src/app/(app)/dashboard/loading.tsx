import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Skeleton className="mb-1.5 h-3.5 w-24" />
          <Skeleton className="h-[34px] w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Rank banner */}
      <SkeletonCard className="mb-5 h-[106px]" />

      {/* Quick stats */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-[75px]" />
        ))}
      </div>

      {/* CTA */}
      <Skeleton className="mb-6 h-14 rounded-xl" />

      {/* Activity feed */}
      <div className="mb-2 flex h-10 items-center justify-between">
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
