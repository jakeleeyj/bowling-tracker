import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";
import {
  getCurrentSeason,
  getReachedMilestones,
  getSeasonDaysLeft,
  type SeasonMilestone,
} from "@/lib/seasons";

export const dynamic = "force-dynamic";

webpush.setVapidDetails(
  "mailto:spareme@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

interface PushPayload {
  title: string;
  body: string;
  url: string;
}

function payloadFor(
  milestone: SeasonMilestone,
  season: ReturnType<typeof getCurrentSeason>,
): PushPayload {
  const daysLeft = getSeasonDaysLeft(season);
  switch (milestone) {
    case "30d":
      return {
        title: `${season.shortName} ends in 30 days`,
        body: "Climb the ranks before the season resets.",
        url: "/leaderboard",
      };
    case "7d":
      return {
        title: `${season.shortName} ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`,
        body: "Final stretch — lock in your rank.",
        url: "/leaderboard",
      };
    case "started":
      return {
        title: `${season.name} has begun`,
        body: `S${season.number - 1} ended — LP soft-reset toward 1200. Calibration starts fresh.`,
        url: "/leaderboard",
      };
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const season = getCurrentSeason();
  const reached = getReachedMilestones(season);
  if (reached.length === 0) {
    return NextResponse.json({
      message: "No milestones reached",
      season: season.number,
    });
  }

  // Pull already-sent milestones for this season
  const { data: existing } = await supabase
    .from("season_notifications")
    .select("milestone")
    .eq("season_number", season.number);
  const alreadySent = new Set((existing ?? []).map((r) => r.milestone));

  const pending = reached.filter((m) => !alreadySent.has(m));
  if (pending.length === 0) {
    return NextResponse.json({
      message: "All reached milestones already sent",
    });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription, id");

  const results: Record<string, number> = {};

  for (const milestone of pending) {
    const payload = JSON.stringify(payloadFor(milestone, season));
    const staleIds: string[] = [];
    let sent = 0;

    if (subs && subs.length > 0) {
      await Promise.allSettled(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              sub.subscription as unknown as webpush.PushSubscription,
              payload,
            );
            sent++;
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number })?.statusCode;
            if (statusCode === 410 || statusCode === 404) {
              staleIds.push(sub.id);
            }
          }
        }),
      );
      if (staleIds.length > 0) {
        await supabase.from("push_subscriptions").delete().in("id", staleIds);
      }
    }

    // Record the send (use upsert in case of race with another cron tick)
    await supabase
      .from("season_notifications")
      .upsert(
        { season_number: season.number, milestone },
        { onConflict: "season_number,milestone" },
      );

    results[milestone] = sent;
  }

  return NextResponse.json({
    season: season.number,
    sent: results,
  });
}
