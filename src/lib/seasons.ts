// Season configuration
// Season 1: Mar 19 2026 → Dec 31 2026 (inaugural season)
// After that: 6-month cycles (Jan 1–Jun 30, Jul 1–Dec 31)

export interface Season {
  number: number;
  name: string;
  shortName: string;
  start: Date;
  end: Date;
}

const SEASONS: Season[] = [
  {
    number: 1,
    name: "Season 1",
    shortName: "S1",
    start: new Date("2026-03-19T00:00:00+08:00"),
    end: new Date("2026-12-31T23:59:59+08:00"),
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

  // Check hardcoded seasons first
  for (const s of SEASONS) {
    if (now >= s.start && now <= s.end) return s;
  }

  // Generate future seasons: S2 = H1 2027, S3 = H2 2027, etc.
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const half = month < 6 ? "H1" : "H2";

  // Season numbering: S1 ends Dec 2026, S2 = H1 2027, S3 = H2 2027, ...
  const yearOffset = year - 2027;
  const num = 2 + yearOffset * 2 + (half === "H2" ? 1 : 0);

  return generateSeason(half, year, num);
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
