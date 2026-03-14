import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function GameLoading() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>

      <SkeletonCard className="mb-4 h-24" />

      {/* Scorecard skeleton */}
      <SkeletonCard className="mb-4 h-32" />

      {/* Stats */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-16 flex-1" />
        ))}
      </div>
    </div>
  );
}
