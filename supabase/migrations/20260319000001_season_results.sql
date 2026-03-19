-- Season results: stores final rank for each player at end of season
-- Populated by end_season() function when a season concludes

create table if not exists season_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  season_number int not null,
  season_name text not null,
  final_lp int not null,
  final_rank text not null,
  final_division text,
  final_avg int not null default 0,
  final_high int not null default 0,
  total_games int not null default 0,
  ended_at timestamptz not null default now(),
  unique(user_id, season_number)
);

create index if not exists idx_season_results_user on season_results(user_id);

-- RLS: everyone can read season results (public leaderboard history)
alter table season_results enable row level security;
create policy "Season results readable by all authenticated users"
  on season_results for select
  to authenticated using (true);

-- End a season: freeze all players' current rankings into season_results,
-- then soft-reset LP for the new season
-- new_lp = 1200 + (old_lp - 1200) * 0.3 (compress toward Silver baseline)
create or replace function end_season(p_season_number int, p_season_name text)
returns void
language plpgsql security definer as $$
declare
  v_row record;
  v_new_lp int;
begin
  -- Freeze current rankings into season_results
  insert into season_results (user_id, season_number, season_name, final_lp, final_rank, final_division, final_avg, final_high, total_games)
  select
    user_id, p_season_number, p_season_name, lp, rank, division, avg, high, total_games
  from player_rankings_cache
  where total_games > 0
  on conflict (user_id, season_number) do nothing;

  -- Soft reset LP: compress toward 1200
  for v_row in select user_id, lp from player_rankings_cache loop
    v_new_lp := 1200 + round((v_row.lp - 1200) * 0.3);
    v_new_lp := greatest(v_new_lp, 0);

    update player_rankings_cache
    set lp = v_new_lp, updated_at = now()
    where user_id = v_row.user_id;
  end loop;

  -- Clear session LP cache (old deltas are meaningless after reset)
  delete from session_lp_cache;
end;
$$;
