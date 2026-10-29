import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function StatsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading stats">
      <h1 className="mb-5 text-[28px] leading-[34px] font-extrabold tracking-tight">
        Stats
      </h1>
      <Skeleton className="mb-2 h-11" />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-20 rounded-full" />
        ))}
      </div>
      <Skeleton className="mb-5 h-11" />
      <div className="mb-5 grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} className="h-[76px]" />
        ))}
      </div>
      <SkeletonCard className="mb-5 h-[200px]" />
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} className="h-[92px]" />
        ))}
      </div>
    </div>
  );
}
