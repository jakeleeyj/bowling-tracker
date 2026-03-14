import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function PlayerLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-4 w-16" />

      <div className="mb-5 flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div>
          <Skeleton className="mb-1 h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-20 flex-1" />
        ))}
      </div>

      <Skeleton className="mb-3 h-4 w-28" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
