import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function HistoryLoading() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-28" />
      </div>

      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-4 w-24" />
            <div className="flex flex-col gap-2">
              <SkeletonCard className="h-20" />
              <SkeletonCard className="h-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
