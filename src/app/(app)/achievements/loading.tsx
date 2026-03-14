import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function AchievementsLoading() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-32" />
      </div>

      <div className="mb-4 flex gap-2">
        <SkeletonCard className="h-20 flex-1" />
        <SkeletonCard className="h-20 flex-1" />
      </div>

      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
