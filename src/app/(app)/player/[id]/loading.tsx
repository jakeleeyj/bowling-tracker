import { BowlingSpinner, Skeleton } from "@/components/Skeleton";

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

      <div className="flex flex-col items-center py-12">
        <BowlingSpinner />
        <p className="mt-3 text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  );
}
