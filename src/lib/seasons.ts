// Season configuration
// Season 1: Mar 19 2026 → Jun 30 2026 (partial inaugural season)
// Season 2+: 6-month calendar halves (H1 Jan 1–Jun 30, H2 Jul 1–Dec 31)

export interface Season {
  number: number;
  name: string;
  shortName: string;
  start: Date;
  end: Date;
}

// Public deployment starts its own Season 1 in H2 2026: setting
// NEXT_PUBLIC_SEASON_OFFSET=1 shifts numbering down by one and skips the
// private inaugural season below.
const SEASON_OFFSET = Number(process.env.NEXT_PUBLIC_SEASON_OFFSET ?? 0);

const SEASONS: Season[] = [
  {
    number: 1,
    name: "Season 1",
    shortName: "S1",
    start: new Date("2026-03-19T00:00:00+08:00"),
    end: new Date("2026-06-30T23:59:59+08:00"),
  },
];

function generateSeason(half: "H1" | "H2", year: number, num: number): Season {
  if (half === "H1") {
    return {
      number: num,
      name: `Season ${num}`,
      shortName: `S${num}`,
      start: new Date(`${year}-01-01T00:00:00+08:00`),
      end: new Date(`${year}-06-30T23:59:59+08:00`),
    };
  }
  return {
    number: num,
    name: `Season ${num}`,
    shortName: `S${num}`,
    start: new Date(`${year}-07-01T00:00:00+08:00`),
    end: new Date(`${year}-12-31T23:59:59+08:00`),
  };
}

export function getCurrentSeason(): Season {
  const now = new Date();

  // Check hardcoded seasons first (private deployment only)
  if (SEASON_OFFSET === 0) {
    for (const s of SEASONS) {
      if (now >= s.start && now <= s.end) return s;
    }
  }

  // Generate calendar-half seasons from H2 2026 onward.
  // Numbering: H2 2026 = S2, H1 2027 = S3, H2 2027 = S4, ...
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const half = month < 6 ? "H1" : "H2";
  const num = 2 * (year - 2026) + (half === "H1" ? 1 : 2) - SEASON_OFFSET;

  return generateSeason(half, year, num);
}

export function getSeasonByNumber(num: number): Season | null {
  if (num < 1) return null;
  if (SEASON_OFFSET === 0) {
    const hardcoded = SEASONS.find((s) => s.number === num);
    if (hardcoded) return hardcoded;
  }
  // Generated seasons (raw numbering): S2 = H2 2026, S3 = H1 2027, ...
  const raw = num + SEASON_OFFSET;
  if (raw < 2) return null;
  if (raw % 2 === 0) {
    return generateSeason("H2", 2026 + (raw - 2) / 2, num);
  }
  return generateSeason("H1", 2026 + (raw - 1) / 2, num);
}

// The season immediately before the current one — the one the end-season
// cron needs to close out after a rollover.
export function getPreviousSeason(): Season | null {
  return getSeasonByNumber(getCurrentSeason().number - 1);
}

export function getSeasonDaysLeft(season: Season): number {
  const now = new Date();
  const diff = season.end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getSeasonProgress(season: Season): number {
  const now = new Date();
  const total = season.end.getTime() - season.start.getTime();
  const elapsed = now.getTime() - season.start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function formatDaysLeft(days: number): string {
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export type SeasonMilestone = "30d" | "7d" | "started";

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Banner-side: continuous threshold — banner stays visible the whole window.
// Priority: 'started' wins over countdown if both ever overlap.
export function getActiveBannerMilestone(
  season: Season,
): SeasonMilestone | null {
  if (season.number > 1 && daysSince(season.start) < 7) return "started";
  const daysLeft = getSeasonDaysLeft(season);
  if (daysLeft <= 7) return "7d";
  if (daysLeft <= 30) return "30d";
  return null;
}

// Cron-side: which milestones have been reached (regardless of whether they
// were already sent — the cron checks the season_notifications table for
// idempotency). Returns all currently-applicable milestones.
export function getReachedMilestones(season: Season): SeasonMilestone[] {
  const reached: SeasonMilestone[] = [];
  const daysLeft = getSeasonDaysLeft(season);
  if (daysLeft <= 30) reached.push("30d");
  if (daysLeft <= 7) reached.push("7d");
  if (season.number > 1 && daysSince(season.start) < 7) reached.push("started");
  return reached;
}
