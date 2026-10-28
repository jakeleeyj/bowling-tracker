import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function PlayerLoading() {
  return (
    <div aria-busy="true" aria-label="Loading player">
      <Skeleton className="mb-4 h-5 w-20" />

      <div className="mb-5 flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-7 w-36" />
      </div>

      <SkeletonCard className="mb-5 h-[106px]" />

      <div className="mb-5 flex gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-[75px] flex-1" />
        ))}
      </div>

      <Skeleton className="mb-3 h-5 w-32" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
