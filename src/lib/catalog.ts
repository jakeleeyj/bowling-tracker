// Ball catalog sourced from bowwwl.com (used with their permission).

export type CatalogBall = {
  id: string;
  name: string;
  brand: string;
  year: string;
  rg: number | null;
  differential: number | null;
  intermediateDiff: number | null;
  coverstock: string | null;
  coverstockName: string;
  coreType: string | null;
  coreName: string;
  factoryFinish: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  discontinued: boolean;
};

export type BowwwlBall = {
  ball_id: string;
  ball_name: string;
  brand_name: string;
  release_date: string;
  core_rg: string;
  core_diff: string;
  core_int_diff: string;
  core_type: string;
  core_name: string;
  coverstock_type: string;
  coverstock_name: string;
  factory_finish: string;
  ball_image: string;
  thumbnail_image: string;
  availability: string;
};

export const BOWWWL_ORIGIN = "https://www.bowwwl.com";

// bowwwl describes the cover in more detail than our five buckets.
export function mapCoverstock(type: string): string | null {
  const t = type.toLowerCase();
  if (t === "") return null;
  if (t.includes("urethane") || t.includes("microcell")) return "urethane";
  if (t.includes("polyester") || t.includes("plastic")) return "plastic";
  if (t.includes("hybrid")) return "hybrid";
  if (t.includes("pearl")) return "pearl";
  if (t.includes("solid") || t.includes("particle")) return "solid";
  return null;
}

export function mapCoreType(type: string): string | null {
  const t = type.toLowerCase();
  if (t === "symmetric" || t === "asymmetric") return t;
  return null;
}

function num(value: string): number | null {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

function absolute(path: string): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BOWWWL_ORIGIN}${path}`;
}

export function toCatalogBall(raw: BowwwlBall): CatalogBall {
  return {
    id: raw.ball_id,
    name: raw.ball_name,
    brand: raw.brand_name,
    year: raw.release_date?.slice(0, 4) ?? "",
    rg: num(raw.core_rg),
    differential: num(raw.core_diff),
    intermediateDiff: num(raw.core_int_diff),
    coverstock: mapCoverstock(raw.coverstock_type ?? ""),
    coverstockName: raw.coverstock_name ?? "",
    coreType: mapCoreType(raw.core_type ?? ""),
    coreName: raw.core_name ?? "",
    factoryFinish: raw.factory_finish ?? "",
    imageUrl: absolute(raw.ball_image),
    thumbUrl: absolute(raw.thumbnail_image),
    discontinued: raw.availability === "Discontinued",
  };
}

// Name-and-brand search; every typed word must appear somewhere.
export function searchCatalog(
  balls: CatalogBall[],
  query: string,
  limit = 20,
): CatalogBall[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: CatalogBall[] = [];
  for (const ball of balls) {
    const hay = `${ball.brand} ${ball.name}`.toLowerCase();
    if (words.every((w) => hay.includes(w))) {
      out.push(ball);
      if (out.length >= limit) break;
    }
  }
  return out;
}
