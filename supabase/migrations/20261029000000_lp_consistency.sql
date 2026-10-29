-- LP consistency fixes (DRAFT — review before applying)
--
-- What this changes
--   #3  New recompute_player_season_deltas(user): rebuilds ALL of a player's
--       current-season session deltas as chronological prefixes
--       (delta(S) = LP(sessions up to and incl. S) - LP(sessions before S)),
--       upserts them, deletes stale rows (past-season / removed sessions), and
--       refreshes the ranking. Called from the games insert/update/delete
--       triggers and a NEW sessions trigger on event_label changes (#1).
--       Session delete is covered by the FK cascade on games, which fires the
--       games delete trigger (no separate sessions delete trigger needed).
--       Deltas telescope: baseline + sum(deltas) = cached LP (for players
--       calibrated before this season). Sessions are ordered by
--       sessions.created_at (then id), matching the client walk-back order.
--       Sessions that end with fewer than 4 lifetime games get no row
--       ("calibrating"), same gate as the old insert path.
--       compute_session_delta / refresh_session_lp_deltas become wrappers
--       around the recompute so no second delta basis can remain.
--   #10 All LP game ordering is (created_at, game_number, id), newest-first.
--   #2/#11 end_season computes each player's final LP from that season's game
--       history (baseline row for that season, else 1200), not the cache.
--       Only players with games in the season get a season_results row and the
--       30% soft reset. Stored total_games / final_avg / final_high are
--       season-scoped. Players inactive that season keep their baseline
--       unchanged (row carried forward to the next season) — product decision,
--       see note in end_season. Idempotent (no-op if results already exist);
--       refuses to end the current or a future season.
--   #6  progress: Master/Grandmaster = floor((lp - min) / (max - min) * 100)
--       clamped 0-100; Challenger = 100; divisioned tiers unchanged.
--       get_all_rankings reads progress from player_rankings_cache, so only
--       refresh_player_ranking changes (the backfill refreshes every player).
--   Grants: LP-writing functions are revoked from anon/authenticated (they are
--       SECURITY DEFINER and were callable by anyone via RPC). Triggers and the
--       service-role cron are unaffected.
--
-- Conventions / assumptions
--   - Matches existing functions: plpgsql, SECURITY DEFINER, no explicit
--     search_path (not hardened here, to stay consistent with the codebase).
--   - Tier ranges mirror src/lib/ranking.ts (Iron 0, Bronze 1000, Silver 1200,
--     Gold 1400, Platinum 1600, Emerald 1800, Diamond 2000, Master 2200,
--     Grandmaster 2400, Challenger 2600+). Event weights mirror EVENT_WEIGHTS.
--   - Season windows mirror src/lib/seasons.ts (Asia/Singapore halves). For
--     LP, Season 1 = all games before 2026-07-01 SGT (same as the 0707 backfill).
--   - No explicit BEGIN/COMMIT: the migration runner wraps the file in a
--     transaction.
--
-- Verification queries (read-only; run after applying)
--
--   -- 1. Telescoping: baseline + sum(current-season deltas) = cached LP.
--   --    Only players with >= 4 games before this season (players who
--   --    calibrated this season have hidden calibration LP before their first
--   --    delta row, so they are expected to differ). Expect 0 rows.
--   select r.user_id, r.lp,
--          coalesce(b.baseline_lp, 1200) + coalesce(d.sum_delta, 0) as rebuilt
--   from player_rankings_cache r
--   left join season_baselines b
--     on b.user_id = r.user_id and b.season_number = current_season_number()
--   left join (select user_id, sum(lp_delta) as sum_delta
--              from session_lp_cache group by user_id) d on d.user_id = r.user_id
--   where (select count(*) from games g
--          where g.user_id = r.user_id and g.created_at < current_season_start()) >= 4
--     and r.lp <> coalesce(b.baseline_lp, 1200) + coalesce(d.sum_delta, 0);
--
--   -- 2. No delta rows for sessions without current-season games. Expect 0.
--   select count(*) from session_lp_cache c
--   where not exists (select 1 from games g where g.session_id = c.session_id
--                     and g.created_at >= current_season_start());
--
--   -- 3. Season results only for players with games in that season.
--   --    Expect 0 rows.
--   select sr.user_id, sr.season_number
--   from season_results sr
--   where not exists (
--     select 1 from games g
--     where g.user_id = sr.user_id
--       and g.created_at >= season_start_at(sr.season_number)
--       and g.created_at <  season_start_at(sr.season_number + 1));
--
--   -- 4. Progress rule for non-divisioned tiers. Expect 0 rows.
--   select user_id, lp, rank, progress from player_rankings_cache
--   where (rank = 'Challenger' and progress <> 100)
--      or (rank = 'Master' and progress <> least(greatest(floor((lp - 2200) / 2.0), 0), 100))
--      or (rank = 'Grandmaster' and progress <> least(greatest(floor((lp - 2400) / 2.0), 0), 100));
--
--   -- 5. Cache LP matches a fresh recompute (no writes): compare
--   --    player_rankings_cache.lp with lp_from_games() over current-season games.
--   select r.user_id, r.lp, x.lp as fresh
--   from player_rankings_cache r
--   cross join lateral (
--     select lp_from_games(
--       array_agg(g.total_score order by g.created_at desc, g.game_number desc, g.id desc),
--       array_agg(lp_event_weight(s.event_label) order by g.created_at desc, g.game_number desc, g.id desc),
--       (select count(*)::int from games p where p.user_id = r.user_id and p.created_at < current_season_start()),
--       coalesce((select baseline_lp from season_baselines b where b.user_id = r.user_id
--                 and b.season_number = current_season_number()), 1200)) as lp
--     from games g join sessions s on s.id = g.session_id
--     where g.user_id = r.user_id and g.created_at >= current_season_start()
--   ) x
--   where r.total_games > 0 and r.lp <> x.lp;


-- ---------------------------------------------------------------------------
-- 1. Pure helpers (single source of the LP formula, tiers, event weights)
-- ---------------------------------------------------------------------------

create or replace function lp_event_weight(p_label text)
returns numeric
language sql immutable as $$
  select case p_label
    when 'Tournament' then 1.5
    when 'Funbowl' then 1.35
    when 'League' then 1.25
    else 1.0
  end;
$$;

-- LP from a list of games, NEWEST FIRST. p_prior = lifetime games before the
-- first game in the list (for the first-4-games-ever placement boost).
-- Same arithmetic as refresh_player_ranking since 20260707000000.
create or replace function lp_from_games(
  p_scores int[],
  p_weights numeric[],
  p_prior int,
  p_baseline int
)
returns int
language plpgsql immutable as $$
declare
  v_n int := coalesce(array_length(p_scores, 1), 0);
  v_lp numeric := p_baseline;
  i int;
begin
  for i in 1..v_n loop
    v_lp := v_lp + round(
      (p_scores[i] - 185) *
      case when p_prior + (v_n - i + 1) <= 4 then 1.0 else p_weights[i] end *
      case when p_prior + (v_n - i + 1) <= 4 then 5 else 1 end *
      greatest(0.25, 1.0 - (i - 1) * 0.0125)
    );
  end loop;
  return round(greatest(v_lp, 0))::int;
end;
$$;

-- Rank / division / progress for an LP value (mirrors src/lib/ranking.ts).
create or replace function lp_tier(
  p_lp int,
  out rank text,
  out division text,
  out progress int
)
language plpgsql immutable as $$
declare
  v_min int;
  v_max int;
  v_div_size numeric;
begin
  division := null;

  if p_lp >= 2600 then
    rank := 'Challenger';
    progress := 100;
    return;
  elsif p_lp >= 2400 then rank := 'Grandmaster'; v_min := 2400; v_max := 2600;
  elsif p_lp >= 2200 then rank := 'Master'; v_min := 2200; v_max := 2400;
  elsif p_lp >= 2000 then rank := 'Diamond'; v_min := 2000; v_max := 2200;
  elsif p_lp >= 1800 then rank := 'Emerald'; v_min := 1800; v_max := 2000;
  elsif p_lp >= 1600 then rank := 'Platinum'; v_min := 1600; v_max := 1800;
  elsif p_lp >= 1400 then rank := 'Gold'; v_min := 1400; v_max := 1600;
  elsif p_lp >= 1200 then rank := 'Silver'; v_min := 1200; v_max := 1400;
  elsif p_lp >= 1000 then rank := 'Bronze'; v_min := 1000; v_max := 1200;
  else rank := 'Iron'; v_min := 0; v_max := 1000;
  end if;

  if rank in ('Master', 'Grandmaster') then
    progress := least(greatest(
      floor((p_lp - v_min)::numeric / (v_max - v_min) * 100)::int, 0), 100);
    return;
  end if;

  division := (array['IV','III','II','I'])[least(floor(
    (p_lp - v_min)::numeric / (v_max - v_min) * 4
  )::int, 3) + 1];
  v_div_size := (v_max - v_min)::numeric / 4;
  progress := least(round(
    (((p_lp - v_min)::numeric) % v_div_size) / v_div_size * 100
  )::int, 100);
end;
$$;

-- Start of season N in Asia/Singapore (mirrors src/lib/seasons.ts).
-- Season 1 LP covered all games before Season 2, so its LP window starts at
-- -infinity. Season N ends at season_start_at(N + 1) (half-open window).
create or replace function season_start_at(p_season_number int)
returns timestamptz
language sql stable as $$
  select case
    when p_season_number <= 1 then '-infinity'::timestamptz
    when p_season_number % 2 = 0 then
      make_timestamptz(2026 + (p_season_number - 2) / 2, 7, 1, 0, 0, 0, 'Asia/Singapore')
    else
      make_timestamptz(2026 + (p_season_number - 1) / 2, 1, 1, 0, 0, 0, 'Asia/Singapore')
  end;
$$;


-- ---------------------------------------------------------------------------
-- 2. refresh_player_ranking: shared helpers, stable ordering, new progress
-- ---------------------------------------------------------------------------

create or replace function refresh_player_ranking(p_user_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_all_scores int[];
  v_scores int[];
  v_weights numeric[];
  v_lp int;
  v_baseline int;
  v_prior int;
  v_total int;
  v_season_total int;
  v_season_avg int := 0;
  v_avg int := 0;
  v_high int := 0;
  v_rank text;
  v_division text;
  v_trend text := 'stable';
  v_progress int;
begin
  -- Lifetime scores (avg / high / trend)
  select array_agg(g.total_score order by g.created_at desc, g.game_number desc, g.id desc)
  into v_all_scores
  from games g
  where g.user_id = p_user_id;

  v_total := coalesce(array_length(v_all_scores, 1), 0);

  -- Current-season scores + weights (LP, season stats)
  select
    array_agg(g.total_score order by g.created_at desc, g.game_number desc, g.id desc),
    array_agg(lp_event_weight(s.event_label) order by g.created_at desc, g.game_number desc, g.id desc)
  into v_scores, v_weights
  from games g
  join sessions s on s.id = g.session_id
  where g.user_id = p_user_id
    and g.created_at >= current_season_start();

  v_season_total := coalesce(array_length(v_scores, 1), 0);
  v_prior := v_total - v_season_total;

  if v_season_total > 0 then
    v_season_avg := floor((select avg(unnest) from unnest(v_scores)));
  end if;

  select coalesce(
    (select baseline_lp from season_baselines
     where user_id = p_user_id and season_number = current_season_number()),
    1200
  ) into v_baseline;

  if v_total = 0 then
    v_lp := 0;
  else
    v_avg := floor((select avg(unnest) from unnest(v_all_scores)));
    v_high := (select max(unnest) from unnest(v_all_scores));
    v_lp := lp_from_games(v_scores, v_weights, v_prior, v_baseline);

    if v_total >= 10 then
      if (v_all_scores[1]+v_all_scores[2]+v_all_scores[3]+v_all_scores[4]+v_all_scores[5])::numeric/5 -
         (v_all_scores[6]+v_all_scores[7]+v_all_scores[8]+v_all_scores[9]+v_all_scores[10])::numeric/5 > 5 then
        v_trend := 'up';
      elsif (v_all_scores[6]+v_all_scores[7]+v_all_scores[8]+v_all_scores[9]+v_all_scores[10])::numeric/5 -
            (v_all_scores[1]+v_all_scores[2]+v_all_scores[3]+v_all_scores[4]+v_all_scores[5])::numeric/5 > 5 then
        v_trend := 'down';
      end if;
    end if;
  end if;

  select t.rank, t.division, t.progress
  into v_rank, v_division, v_progress
  from lp_tier(v_lp) t;

  insert into player_rankings_cache (user_id, lp, total_games, avg, high, rank, division, trend, progress, season_avg, season_games, updated_at)
  values (p_user_id, v_lp, v_total, v_avg, v_high, v_rank, v_division, v_trend, v_progress, v_season_avg, v_season_total, now())
  on conflict (user_id) do update set
    lp = excluded.lp, total_games = excluded.total_games, avg = excluded.avg,
    high = excluded.high, rank = excluded.rank, division = excluded.division,
    trend = excluded.trend, progress = excluded.progress,
    season_avg = excluded.season_avg, season_games = excluded.season_games,
    updated_at = excluded.updated_at;

  return v_lp;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. recompute_player_season_deltas: one basis for every LP-changing path
-- ---------------------------------------------------------------------------

create or replace function recompute_player_season_deltas(p_user_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_season_start timestamptz := current_season_start();
  v_full_lp int;
  v_baseline int;
  v_prior int;
  v_sessions uuid[];
  v_scores int[];
  v_weights numeric[];
  v_sess_ord int[];
  v_sub_scores int[];
  v_sub_weights numeric[];
  v_sub_count int;
  v_prev_lp int;
  v_cur_lp int;
  v_keep uuid[] := '{}';
  k int;
begin
  -- Profile already gone (account delete cascading into games): nothing to
  -- write, and inserting cache rows would violate their FKs.
  if p_user_id is null or not exists (select 1 from profiles where id = p_user_id) then
    return null;
  end if;

  v_full_lp := refresh_player_ranking(p_user_id);

  select coalesce(
    (select baseline_lp from season_baselines
     where user_id = p_user_id and season_number = current_season_number()),
    1200
  ) into v_baseline;

  select count(*)::int into v_prior
  from games g
  where g.user_id = p_user_id and g.created_at < v_season_start;

  -- Current-season sessions, oldest first (same order the client walks back)
  select array_agg(x.id order by x.created_at, x.id)
  into v_sessions
  from (
    select distinct s.id, s.created_at
    from games g
    join sessions s on s.id = g.session_id
    where g.user_id = p_user_id and g.created_at >= v_season_start
  ) x;

  -- Current-season games newest first, tagged with their session's position
  select
    array_agg(g.total_score order by g.created_at desc, g.game_number desc, g.id desc),
    array_agg(lp_event_weight(s.event_label) order by g.created_at desc, g.game_number desc, g.id desc),
    array_agg(array_position(v_sessions, g.session_id) order by g.created_at desc, g.game_number desc, g.id desc)
  into v_scores, v_weights, v_sess_ord
  from games g
  join sessions s on s.id = g.session_id
  where g.user_id = p_user_id and g.created_at >= v_season_start;

  v_prev_lp := v_baseline;

  for k in 1..coalesce(array_length(v_sessions, 1), 0) loop
    -- Games from sessions 1..k, keeping newest-first order
    select
      array_agg(t.score order by t.idx),
      array_agg(t.weight order by t.idx),
      count(*)::int
    into v_sub_scores, v_sub_weights, v_sub_count
    from unnest(v_scores, v_weights, v_sess_ord) with ordinality as t(score, weight, sess_ord, idx)
    where t.sess_ord <= k;

    v_cur_lp := lp_from_games(v_sub_scores, v_sub_weights, v_prior, v_baseline);

    -- Same gate as the old insert path: no delta while still calibrating
    if v_prior + v_sub_count >= 4 then
      insert into session_lp_cache (session_id, user_id, lp_delta, updated_at)
      values (v_sessions[k], p_user_id, v_cur_lp - v_prev_lp, now())
      on conflict (session_id) do update set
        user_id = excluded.user_id,
        lp_delta = excluded.lp_delta,
        updated_at = excluded.updated_at;
      v_keep := v_keep || v_sessions[k];
    end if;

    v_prev_lp := v_cur_lp;
  end loop;

  -- Drop calibrating, past-season and removed sessions' rows
  delete from session_lp_cache
  where user_id = p_user_id
    and session_id <> all(v_keep);

  return v_full_lp;
end;
$$;

-- Legacy entry points now delegate, so only one delta basis exists.
create or replace function compute_session_delta(p_user_id uuid, p_session_id uuid, p_full_lp int)
returns void
language plpgsql security definer as $$
begin
  perform recompute_player_season_deltas(p_user_id);
end;
$$;

create or replace function refresh_session_lp_deltas(p_user_id uuid)
returns void
language plpgsql security definer as $$
begin
  perform recompute_player_season_deltas(p_user_id);
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. Triggers. Recompute only writes cache tables (no triggers there), so
--    nothing recurses. A per-user advisory lock serialises concurrent saves
--    for the same player so the later transaction recomputes from committed
--    data instead of overwriting it with a stale snapshot.
-- ---------------------------------------------------------------------------

create or replace function trigger_refresh_cache_on_insert()
returns trigger
language plpgsql security definer as $$
declare
  v_rec record;
begin
  for v_rec in select distinct user_id from new_rows order by user_id loop
    perform pg_advisory_xact_lock(hashtextextended('lp:' || v_rec.user_id::text, 0));
    perform recompute_player_season_deltas(v_rec.user_id);
  end loop;
  return null;
end;
$$;

-- Also covers session delete: games cascade-delete as one statement.
create or replace function trigger_refresh_cache_on_delete()
returns trigger
language plpgsql security definer as $$
declare
  v_rec record;
begin
  for v_rec in select distinct user_id from old_rows order by user_id loop
    perform pg_advisory_xact_lock(hashtextextended('lp:' || v_rec.user_id::text, 0));
    perform recompute_player_season_deltas(v_rec.user_id);
  end loop;
  return null;
end;
$$;

-- Was row-level and only refreshed the edited session's delta. Now
-- statement-level, and only for rows whose LP inputs changed.
-- (Column lists can't be combined with transition tables, so filter here.)
drop trigger if exists trg_refresh_cache_update on games;

create or replace function trigger_refresh_cache_on_update()
returns trigger
language plpgsql security definer as $$
declare
  v_rec record;
begin
  for v_rec in
    with changed as (
      select o.user_id as old_user_id, n.user_id as new_user_id
      from old_rows o
      join new_rows n on n.id = o.id
      where (o.total_score, o.created_at, o.game_number, o.session_id, o.user_id)
            is distinct from
            (n.total_score, n.created_at, n.game_number, n.session_id, n.user_id)
    )
    select old_user_id as user_id from changed
    union
    select new_user_id from changed
    order by 1
  loop
    perform pg_advisory_xact_lock(hashtextextended('lp:' || v_rec.user_id::text, 0));
    perform recompute_player_season_deltas(v_rec.user_id);
  end loop;
  return null;
end;
$$;

create trigger trg_refresh_cache_update
  after update on games
  referencing old table as old_rows new table as new_rows
  for each statement
  execute function trigger_refresh_cache_on_update();

-- #1: event label edits change event weights
create or replace function trigger_refresh_cache_on_session_label()
returns trigger
language plpgsql security definer as $$
begin
  if exists (select 1 from games where session_id = new.id) then
    perform pg_advisory_xact_lock(hashtextextended('lp:' || new.user_id::text, 0));
    perform recompute_player_season_deltas(new.user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_refresh_cache_session_label on sessions;
create trigger trg_refresh_cache_session_label
  after update of event_label on sessions
  for each row
  when (old.event_label is distinct from new.event_label)
  execute function trigger_refresh_cache_on_session_label();


-- ---------------------------------------------------------------------------
-- 5. end_season: final LP from game history, active players only
-- ---------------------------------------------------------------------------

create or replace function end_season(p_season_number int, p_season_name text)
returns void
language plpgsql security definer as $$
declare
  v_start timestamptz := season_start_at(p_season_number);
  v_end timestamptz := season_start_at(p_season_number + 1);
  v_user record;
  v_scores int[];
  v_weights numeric[];
  v_prior int;
  v_baseline int;
  v_lp int;
  v_games int;
  v_avg int;
  v_high int;
  v_rank text;
  v_division text;
begin
  -- Idempotent: already ended
  if exists (select 1 from season_results where season_number = p_season_number) then
    return;
  end if;

  -- Never close the running season (or a future one)
  if p_season_number >= current_season_number() then
    raise exception 'Season % has not ended yet', p_season_number;
  end if;

  for v_user in
    select distinct g.user_id
    from games g
    join profiles p on p.id = g.user_id
    where g.created_at >= v_start and g.created_at < v_end
    order by g.user_id
  loop
    -- Baseline the player had DURING this season (read before it is replaced)
    select coalesce(
      (select baseline_lp from season_baselines
       where user_id = v_user.user_id and season_number = p_season_number),
      1200
    ) into v_baseline;

    select count(*)::int into v_prior
    from games g
    where g.user_id = v_user.user_id and g.created_at < v_start;

    select
      array_agg(g.total_score order by g.created_at desc, g.game_number desc, g.id desc),
      array_agg(lp_event_weight(s.event_label) order by g.created_at desc, g.game_number desc, g.id desc),
      count(*)::int,
      floor(avg(g.total_score))::int,
      max(g.total_score)
    into v_scores, v_weights, v_games, v_avg, v_high
    from games g
    join sessions s on s.id = g.session_id
    where g.user_id = v_user.user_id
      and g.created_at >= v_start and g.created_at < v_end;

    v_lp := lp_from_games(v_scores, v_weights, v_prior, v_baseline);

    select t.rank, t.division into v_rank, v_division from lp_tier(v_lp) t;

    -- Season-scoped stats (games / avg / high from this season only)
    insert into season_results (user_id, season_number, season_name, final_lp, final_rank, final_division, final_avg, final_high, total_games)
    values (v_user.user_id, p_season_number, p_season_name, v_lp, v_rank, v_division, v_avg, v_high, v_games)
    on conflict (user_id, season_number) do nothing;

    -- Soft reset (unchanged rule): 30% of the distance from 1200
    insert into season_baselines (user_id, season_number, baseline_lp, updated_at)
    values (
      v_user.user_id,
      p_season_number + 1,
      greatest(1200 + round((v_lp - 1200) * 0.3)::int, 0),
      now()
    )
    on conflict (user_id) do update set
      season_number = excluded.season_number,
      baseline_lp = excluded.baseline_lp,
      updated_at = excluded.updated_at;
  end loop;

  -- Players who sat this season out: no result, no reset. ASSUMPTION
  -- (product decision): they keep the LP they held all season, so their
  -- baseline row moves forward unchanged. Without this they would fall back
  -- to 1200 next season.
  update season_baselines
  set season_number = p_season_number + 1, updated_at = now()
  where season_number = p_season_number;

  -- Old deltas are meaningless after reset; rebuild everything for the
  -- season we are now in.
  delete from session_lp_cache;

  for v_user in select id as user_id from profiles order by id loop
    perform recompute_player_season_deltas(v_user.user_id);
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. Grants: LP writers are trigger/cron-only
-- ---------------------------------------------------------------------------

revoke execute on function end_season(int, text) from public, anon, authenticated;
revoke execute on function recompute_player_season_deltas(uuid) from public, anon, authenticated;
revoke execute on function refresh_player_ranking(uuid) from public, anon, authenticated;
revoke execute on function compute_session_delta(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function refresh_session_lp_deltas(uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 7. Backfill: rebuild every player's ranking (new progress rule) and all
--    current-season deltas (players without season games just get their
--    ranking refreshed and any stale delta rows removed).
-- ---------------------------------------------------------------------------

do $$
declare
  v_user record;
begin
  for v_user in select id from profiles order by id loop
    perform recompute_player_season_deltas(v_user.id);
  end loop;
end;
$$;
