import { BowlingSpinner, Skeleton } from "@/components/Skeleton";

export default function GameLoading() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>

      <div className="flex flex-col items-center py-16">
        <BowlingSpinner />
        <p className="mt-3 text-sm text-text-muted">Loading game...</p>
      </div>
    </div>
  );
}
