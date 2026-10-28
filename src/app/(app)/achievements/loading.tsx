import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function AchievementsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading achievements">
      <Skeleton className="mb-2 h-7 w-40" />
      <Skeleton className="mb-5 h-5 w-24" />
      <Skeleton className="mb-3 h-5 w-16" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} className="h-[70px]" />
        ))}
      </div>
    </div>
  );
}
