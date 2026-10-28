import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function LeaderboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading leaderboard">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32 flex-1" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
      </div>

      <SkeletonCard className="mb-5 h-[108px]" />

      <Skeleton className="mb-2 h-3 w-44" />
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
