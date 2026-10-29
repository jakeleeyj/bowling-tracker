import Link from "next/link";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import RankEmblem from "@/components/RankEmblem";
import RankShine from "@/components/RankShine";
import {
  getRank,
  getDivisionProgress,
  formatLP,
  formatCalibrationGamesLeft,
  CALIBRATION_GAMES,
} from "@/lib/ranking";
import { getCurrentSeason } from "@/lib/seasons";

interface RankBannerProps {
  lp: number;
  totalGames: number;
  seasonAvg: number;
  seasonGames: number;
  trend?: "up" | "down" | "stable";
  href?: string;
}

// Season rank banner — same layout as the Ranked page banner:
// rank name, "LP • season avg • season games" line, division progress bar.
export default function RankBanner({
  lp,
  totalGames,
  seasonAvg,
  seasonGames,
  trend = "stable",
  href,
}: RankBannerProps) {
  const rank = getRank(lp);
  const calibrated = totalGames >= CALIBRATION_GAMES;
  const progress = getDivisionProgress(lp);

  const content = (
    <>
      {calibrated && (
        <>
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${rank.color} bg-[radial-gradient(90%_120%_at_0%_0%,color-mix(in_srgb,currentColor_16%,transparent),transparent_60%)]`}
          />
          <RankShine tierColor={rank.color} />
        </>
      )}
      <div className="relative flex items-center gap-3 p-3">
        {calibrated ? (
          <RankEmblem tierName={rank.name} size={40} />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center text-text-muted">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11.25C17.17 22.15 21 17.25 21 12V7L12 2z"
                fill="currentColor"
                fillOpacity={0.1}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <div className="flex-1">
          {calibrated ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-blue/15 px-1.5 py-0.5 text-[9px] font-bold text-blue">
                  {getCurrentSeason().shortName}
                </span>
                <span className={`text-lg font-extrabold ${rank.color}`}>
                  {rank.name}
                  {rank.division ? ` ${rank.division}` : ""}
                </span>
                {trend === "up" && (
                  <ChevronUp size={16} className="text-green" />
                )}
                {trend === "down" && (
                  <ChevronDown size={16} className="text-red" />
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                {formatLP(lp)} LP &bull;{" "}
                {seasonGames > 0 ? (
                  <>
                    avg {seasonAvg} &bull; {seasonGames} game
                    {seasonGames !== 1 ? "s" : ""}
                  </>
                ) : (
                  <>no games this season</>
                )}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-blue/15 px-1.5 py-0.5 text-[9px] font-bold text-blue">
                  {getCurrentSeason().shortName}
                </span>
                <span className="text-lg font-extrabold text-text-muted">
                  Calibrating
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {formatCalibrationGamesLeft(totalGames)}
              </p>
            </>
          )}
        </div>
        {href && (
          <ChevronRight size={16} className="shrink-0 text-text-muted" />
        )}
      </div>

      {calibrated ? (
        <div className="relative px-3 pb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full bg-current shadow-[0_0_10px_color-mix(in_srgb,currentColor_60%,transparent)] ${rank.color}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-text-muted">
            <span>
              {rank.name} {rank.division ?? ""}
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      ) : (
        <div className="relative px-3 pb-3">
          <div className="flex gap-1.5">
            {Array.from({ length: CALIBRATION_GAMES }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < totalGames ? "bg-blue" : "bg-white/5"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );

  const className = `glass relative mb-5 block overflow-hidden border ${calibrated ? rank.borderColor : "border-border/30"}`;

  if (href) {
    return (
      <Link href={href} className={`${className} transition-transform duration-150 ease-out active:scale-[0.98]`}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
