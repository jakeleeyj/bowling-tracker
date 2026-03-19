import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCurrentSeason } from "@/lib/seasons";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const season = getCurrentSeason();
  const now = new Date();

  // Only end the season if we're past the end date
  if (now < season.end) {
    return NextResponse.json({
      message: `Season ${season.number} still active`,
      endsAt: season.end.toISOString(),
    });
  }

  // Check if this season was already ended
  const { data: existing } = await supabase
    .from("season_results")
    .select("id")
    .eq("season_number", season.number)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({
      message: `Season ${season.number} already ended`,
    });
  }

  // End the season
  const { error } = await supabase.rpc("end_season", {
    p_season_number: season.number,
    p_season_name: season.name,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to end season", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Season ${season.number} ended successfully`,
    season: season.name,
  });
}
