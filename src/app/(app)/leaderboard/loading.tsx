import { BowlingSpinner, Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function LeaderboardLoading() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-20" />
      </div>

      <div className="flex flex-col items-center py-12">
        <BowlingSpinner />
        <p className="mt-3 text-sm text-text-muted">Loading...</p>
      </div>

      <div className="flex flex-col gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
