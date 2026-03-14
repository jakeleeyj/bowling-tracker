import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function LeaderboardLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-20" />
      </div>

      {/* Current user rank card */}
      <SkeletonCard className="mb-5 h-24" />

      {/* Rankings list */}
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
