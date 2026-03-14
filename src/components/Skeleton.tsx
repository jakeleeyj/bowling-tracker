export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`glass animate-pulse ${className}`} />;
}
