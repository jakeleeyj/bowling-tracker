import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function ProfileLoading() {
  return (
    <div aria-busy="true" aria-label="Loading profile">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-7 w-12" />
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

      {/* Arsenal */}
      <SkeletonCard className="mb-5 h-[74px]" />

      {/* Rank history */}
      <Skeleton className="mb-2 h-4 w-24" />
      <div className="mb-5 flex gap-1.5">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Achievements */}
      <div className="mb-5 flex h-10 items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-10" />
      </div>

      {/* Game history */}
      <Skeleton className="mb-3 h-4 w-28" />
      <div className="mb-3 flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-16" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-[88px]" />
        ))}
      </div>
    </div>
  );
}
