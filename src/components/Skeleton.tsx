export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`glass animate-pulse ${className}`} />;
}

export function BowlingSpinner({ size = "md" }: { size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-5 w-5" : "h-8 w-8";
  return (
    <div className={`${dims} animate-spin`}>
      <svg viewBox="0 0 32 32" fill="none">
        <circle
          cx="16"
          cy="16"
          r="14"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.15"
        />
        <circle
          cx="16"
          cy="16"
          r="14"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="60 28"
          strokeLinecap="round"
          className="text-blue"
        />
        {/* Bowling ball finger holes */}
        <circle cx="13" cy="11" r="1.5" fill="currentColor" fillOpacity="0.3" />
        <circle cx="18" cy="11" r="1.5" fill="currentColor" fillOpacity="0.3" />
        <circle
          cx="15.5"
          cy="15"
          r="1.5"
          fill="currentColor"
          fillOpacity="0.3"
        />
      </svg>
    </div>
  );
}

export function LoadingScreen({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <BowlingSpinner />
      <p className="mt-3 text-sm text-text-muted">{message}</p>
    </div>
  );
}
