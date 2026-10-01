import { NextResponse } from "next/server";
import { BOWWWL_ORIGIN, toCatalogBall, type BowwwlBall } from "@/lib/catalog";

const PAGE_SIZE = 100;
const MAX_PAGES = 60;
const BATCH = 10;
const SIX_HOURS = 21600;

// bowwwl's paged feed is newest-first; fetch in parallel batches until a
// page comes back short.
async function fetchPage(page: number): Promise<BowwwlBall[]> {
  const res = await fetch(
    `${BOWWWL_ORIGIN}/restapi/balls/v2?page=${page}&_format=json`,
    {
      headers: { "User-Agent": "spare-me/1.0 (spareme.club)" },
      next: { revalidate: SIX_HOURS },
    },
  );
  if (!res.ok) throw new Error(`bowwwl page ${page}: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as BowwwlBall[]) : [];
}

export async function GET() {
  try {
    const all: BowwwlBall[] = [];
    for (let start = 0; start < MAX_PAGES; start += BATCH) {
      const pages = await Promise.all(
        Array.from({ length: BATCH }, (_, i) => fetchPage(start + i)),
      );
      for (const page of pages) all.push(...page);
      if (pages.some((page) => page.length < PAGE_SIZE)) break;
    }
    const balls = all.map(toCatalogBall);
    return NextResponse.json(balls, {
      headers: {
        "Cache-Control": `public, s-maxage=${SIX_HOURS}, stale-while-revalidate=86400`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Catalog unavailable" }, { status: 502 });
  }
}
