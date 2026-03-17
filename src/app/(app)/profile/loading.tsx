import { BowlingSpinner, Skeleton } from "@/components/Skeleton";

export default function ProfileLoading() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div>
          <Skeleton className="mb-1 h-5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex flex-col items-center py-12">
        <BowlingSpinner />
        <p className="mt-3 text-sm text-text-muted">Loading profile...</p>
      </div>
    </div>
  );
}
