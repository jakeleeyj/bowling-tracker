import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function GameLoading() {
  return (
    <div aria-busy="true" aria-label="Loading game">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="mb-1 h-6 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-[76px] flex-1" />
        ))}
      </div>

      <SkeletonCard className="h-[52px]" />
      <SkeletonCard className="mt-2 h-32" />
    </div>
  );
}
