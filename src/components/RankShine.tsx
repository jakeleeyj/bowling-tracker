/** Slow tier-coloured sheen across the rank card */
export default function RankShine({ tierColor }: { tierColor: string }) {
  return (
    <div
      aria-hidden
      className={`animate-sheen pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_42%,color-mix(in_srgb,currentColor_22%,transparent)_50%,transparent_58%)] bg-[length:250%_100%] bg-no-repeat ${tierColor}`}
    />
  );
}
