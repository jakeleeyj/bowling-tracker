import { BowlingSpinner } from "@/components/Skeleton";

export default function StatsLoading() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold">Stats</h1>
      <div className="flex flex-col items-center justify-center py-16">
        <BowlingSpinner />
        <p className="mt-3 text-sm text-text-muted">Loading stats...</p>
      </div>
    </div>
  );
}
