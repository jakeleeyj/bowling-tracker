interface GaugeTicksProps {
  total: number;
  filled: number;
  className?: string;
}

// Segmented progress gauge used by the Telemetry theme.
export default function GaugeTicks({
  total,
  filled,
  className = "",
}: GaugeTicksProps) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-3.5 flex-1 rounded-[1px] ${i < filled ? "bg-text-primary" : "bg-border-light"}`}
        />
      ))}
    </div>
  );
}
