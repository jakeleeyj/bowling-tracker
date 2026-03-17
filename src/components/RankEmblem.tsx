const TIER_COLORS: Record<string, { fill: string; stroke: string }> = {
  Iron: { fill: "#9ca3af", stroke: "#6b7280" },
  Bronze: { fill: "#b45309", stroke: "#92400e" },
  Silver: { fill: "#d1d5db", stroke: "#9ca3af" },
  Gold: { fill: "#f59e0b", stroke: "#d97706" },
  Platinum: { fill: "#22d3ee", stroke: "#06b6d4" },
  Diamond: { fill: "#3b82f6", stroke: "#2563eb" },
  Master: { fill: "#8b5cf6", stroke: "#7c3aed" },
  Grandmaster: { fill: "#ef4444", stroke: "#dc2626" },
  Emerald: { fill: "#34d399", stroke: "#10b981" },
  Challenger: { fill: "#fb7185", stroke: "#f43f5e" },
};

export default function RankEmblem({
  tierName,
  size = "md",
  className = "",
}: {
  tierName: string;
  size?: "sm" | "md" | "lg" | number;
  className?: string;
}) {
  const dims =
    typeof size === "number"
      ? ""
      : size === "lg"
        ? "h-12 w-12"
        : size === "md"
          ? "h-9 w-9"
          : "h-7 w-7";
  const iconSize =
    typeof size === "number"
      ? size
      : size === "lg"
        ? 28
        : size === "md"
          ? 20
          : 16;
  const colors = TIER_COLORS[tierName] ?? TIER_COLORS.Iron;

  return (
    <div className={`${dims} flex items-center justify-center ${className}`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25C17.17 22.15 21 17.25 21 12V7L12 2z"
          fill={colors.fill}
          fillOpacity={0.2}
          stroke={colors.stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path
          d="M12 7l3 5-3 5-3-5z"
          fill={colors.fill}
          fillOpacity={0.6}
          stroke={colors.stroke}
          strokeWidth={0.75}
        />
      </svg>
    </div>
  );
}
