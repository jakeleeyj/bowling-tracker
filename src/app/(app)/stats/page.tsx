import { Suspense } from "react";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { OverviewStats, LeaveStats, StatsFilter } from "@/lib/queries";
import StatsContent from "./stats-content";
import StatsFilterBar from "./stats-filter";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    dateFrom?: string;
    dateTo?: string;
    event?: string;
  }>;
}

function StatsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading stats">
      <Skeleton className="mb-5 h-11" />
      <div className="mb-5 grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} className="h-[76px]" />
        ))}
      </div>
      <SkeletonCard className="mb-5 h-[200px]" />
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} className="h-[92px]" />
        ))}
      </div>
    </div>
  );
}

async function StatsData({
  filter,
  dateFrom,
  dateTo,
  event,
}: {
  filter: StatsFilter;
  dateFrom: string;
  dateTo: string;
  event: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [overviewResult, leavesResult] = await Promise.all([
    supabase.rpc("get_player_overview_stats", {
      p_user_id: user.id,
      p_filter: filter,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
      p_event: event || null,
    }),
    supabase.rpc("get_player_leave_stats", {
      p_user_id: user.id,
      p_filter: filter,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
      p_event: event || null,
    }),
  ]);

  if (overviewResult.error)
    console.error("overview rpc error:", overviewResult.error);
  if (leavesResult.error)
    console.error("leaves rpc error:", leavesResult.error);

  const overview = (overviewResult.data ?? {}) as unknown as OverviewStats;
  const leaves = (leavesResult.data ?? {}) as unknown as LeaveStats;

  return <StatsContent overview={overview} leaves={leaves} />;
}

export default async function StatsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = (params.filter ?? "last10") as StatsFilter;
  const dateFrom = params.dateFrom ?? "";
  const dateTo = params.dateTo ?? "";
  const event = params.event ?? "";

  return (
    <div>
      <h1 className="mb-5 text-xl font-extrabold">Stats</h1>
      <StatsFilterBar
        currentFilter={filter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        currentEvent={event}
      />
      <Suspense
        key={`${filter}-${dateFrom}-${dateTo}-${event}`}
        fallback={<StatsLoading />}
      >
        <StatsData
          filter={filter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          event={event}
        />
      </Suspense>
    </div>
  );
}
