-- Season-scoped LP
--
-- Fixes two bugs that broke the Season 1 → Season 2 rollover:
-- 1. The end-season cron could never fire (it checked the current season's end,
--    which is always in the future) — fixed in the app code.
-- 2. Even if end_season() had run, the LP soft-reset only wrote to
--    player_rankings_cache; the next logged game re-derived LP from lifetime
--    game history and silently undid the reset.
--
-- New model: each player has a per-season baseline LP (stored in
-- season_baselines). LP = baseline + gains from current-season games only.
-- Placement boost (5x, no event weight) still applies to a player's first 4
-- games EVER, not per season. Recency decay restarts each season.
-- avg / high / trend / total_games remain lifetime stats.

-- 1. Per-user season baseline
create table if not exists season_baselines (
  user_id uuid primary key references profiles(id) on delete cascade,
  season_number int not null,
  baseline_lp int not null default 1200,
  updated_at timestamptz not null default now()
);

alter table season_baselines enable row level security;
create policy "Baselines readable by all authenticated users"
  on season_baselines for select
  to authenticated using (true);

-- 2. Season calendar helpers (Asia/Singapore halves: H1 Jan–Jun, H2 Jul–Dec)
-- Numbering matches src/lib/seasons.ts: H2 2026 = S2, H1 2027 = S3, ...
create or replace function current_season_number()
returns int
language plpgsql stable as $$
declare
  v_local timestamp := now() at time zone 'Asia/Singapore';
begin
  return 2 * (extract(year from v_local)::int - 2026)
    + case when extract(month from v_local)::int <= 6 then 1 else 2 end;
end;
$$;

create or replace function current_season_start()
returns timestamptz
language plpgsql stable as $$
declare
  v_local timestamp := now() at time zone 'Asia/Singapore';
  v_year int := extract(year from v_local)::int;
begin
  if extract(month from v_local)::int <= 6 then
    return make_timestamptz(v_year, 1, 1, 0, 0, 0, 'Asia/Singapore');
  end if;
  return make_timestamptz(v_year, 7, 1, 0, 0, 0, 'Asia/Singapore');
end;
$$;

-- 3. Seasonal refresh_player_ranking
-- LP from baseline + current-season games; avg/high/trend/total_games lifetime.
create or replace function refresh_player_ranking(p_user_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_all_scores int[];
  v_scores int[];
  v_weights numeric[];
  v_lp numeric;
  v_baseline int;
  v_prior int;
  v_total int;
  v_season_total int;
  v_avg int := 0;
  v_high int := 0;
  v_rank text;
  v_division text;
  v_trend text := 'stable';
  v_progress int := 0;
  v_tier_min int;
  v_tier_max int;
  i int;
begin
  -- Lifetime scores (avg / high / trend)
  select array_agg(g.total_score order by g.created_at desc)
  into v_all_scores
  from games g
  where g.user_id = p_user_id;

  v_total := coalesce(array_length(v_all_scores, 1), 0);

  -- Current-season scores + weights (LP)
  select
    array_agg(g.total_score order by g.created_at desc),
    array_agg(
      case s.event_label
        when 'Tournament' then 1.5
        when 'Funbowl' then 1.35
        when 'League' then 1.25
        else 1.0
      end
      order by g.created_at desc
    )
  into v_scores, v_weights
  from games g
  join sessions s on s.id = g.session_id
  where g.user_id = p_user_id
    and g.created_at >= current_season_start();

  v_season_total := coalesce(array_length(v_scores, 1), 0);
  v_prior := v_total - v_season_total;

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

    v_lp := v_baseline;
    for i in 1..v_season_total loop
      -- Placement (5x, weight 1.0) applies to a player's first 4 games ever:
      -- lifetime ordinal = games before this season + oldest-first position.
      v_lp := v_lp + round(
        (v_scores[i] - 185) *
        case when v_prior + (v_season_total - i + 1) <= 4 then 1.0 else v_weights[i] end *
        case when v_prior + (v_season_total - i + 1) <= 4 then 5 else 1 end *
        greatest(0.25, 1.0 - (i - 1) * 0.0125)
      );
    end loop;
    v_lp := greatest(v_lp, 0);

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

  v_tier_min := null; v_tier_max := null; v_division := null;
  if v_lp >= 2600 then v_rank := 'Challenger';
  elsif v_lp >= 2400 then v_rank := 'Grandmaster';
  elsif v_lp >= 2200 then v_rank := 'Master';
  elsif v_lp >= 2000 then v_rank := 'Diamond'; v_tier_min := 2000; v_tier_max := 2200;
  elsif v_lp >= 1800 then v_rank := 'Emerald'; v_tier_min := 1800; v_tier_max := 2000;
  elsif v_lp >= 1600 then v_rank := 'Platinum'; v_tier_min := 1600; v_tier_max := 1800;
  elsif v_lp >= 1400 then v_rank := 'Gold'; v_tier_min := 1400; v_tier_max := 1600;
  elsif v_lp >= 1200 then v_rank := 'Silver'; v_tier_min := 1200; v_tier_max := 1400;
  elsif v_lp >= 1000 then v_rank := 'Bronze'; v_tier_min := 1000; v_tier_max := 1200;
  else v_rank := 'Iron'; v_tier_min := 0; v_tier_max := 1000;
  end if;

  if v_tier_min is not null then
    v_division := (array['IV','III','II','I'])[least(floor(
      (v_lp - v_tier_min)::numeric / (v_tier_max - v_tier_min) * 4
    )::int, 3) + 1];
    declare
      v_div_size numeric := (v_tier_max - v_tier_min)::numeric / 4;
      v_within_div numeric := ((v_lp - v_tier_min)::numeric) % v_div_size;
    begin
      v_progress := least(round(v_within_div / v_div_size * 100)::int, 100);
    end;
  end if;

  insert into player_rankings_cache (user_id, lp, total_games, avg, high, rank, division, trend, progress, updated_at)
  values (p_user_id, round(v_lp)::int, v_total, v_avg, v_high, v_rank, v_division, v_trend, v_progress, now())
  on conflict (user_id) do update set
    lp = excluded.lp, total_games = excluded.total_games, avg = excluded.avg,
    high = excluded.high, rank = excluded.rank, division = excluded.division,
    trend = excluded.trend, progress = excluded.progress, updated_at = excluded.updated_at;

  return round(v_lp)::int;
end;
$$;

-- 4. Seasonal compute_session_delta
create or replace function compute_session_delta(p_user_id uuid, p_session_id uuid, p_full_lp int)
returns void
language plpgsql security definer as $$
declare
  v_scores_without int[];
  v_weights_without numeric[];
  v_without_lp numeric;
  v_total_without int;
  v_baseline int;
  v_prior int;
  i int;
begin
  select coalesce(
    (select baseline_lp from season_baselines
     where user_id = p_user_id and season_number = current_season_number()),
    1200
  ) into v_baseline;

  select count(*)::int into v_prior
  from games g
  where g.user_id = p_user_id and g.created_at < current_season_start();

  -- Current-season games EXCEPT this session's
  select
    array_agg(g.total_score order by g.created_at desc),
    array_agg(
      case ses.event_label
        when 'Tournament' then 1.5
        when 'Funbowl' then 1.35
        when 'League' then 1.25
        else 1.0
      end
      order by g.created_at desc
    )
  into v_scores_without, v_weights_without
  from games g
  join sessions ses on ses.id = g.session_id
  where g.user_id = p_user_id
    and g.session_id != p_session_id
    and g.created_at >= current_season_start();

  v_total_without := coalesce(array_length(v_scores_without, 1), 0);

  v_without_lp := v_baseline;
  for i in 1..v_total_without loop
    v_without_lp := v_without_lp + round(
      (v_scores_without[i] - 185) *
      case when v_prior + (v_total_without - i + 1) <= 4 then 1.0 else v_weights_without[i] end *
      case when v_prior + (v_total_without - i + 1) <= 4 then 5 else 1 end *
      greatest(0.25, 1.0 - (i - 1) * 0.0125)
    );
  end loop;
  v_without_lp := greatest(v_without_lp, 0);

  insert into session_lp_cache (session_id, user_id, lp_delta, updated_at)
  values (p_session_id, p_user_id, p_full_lp - round(v_without_lp)::int, now())
  on conflict (session_id) do update set
    lp_delta = excluded.lp_delta, updated_at = excluded.updated_at;
end;
$$;

-- 5. end_season: freeze results, write next-season baselines, refresh caches
create or replace function end_season(p_season_number int, p_season_name text)
returns void
language plpgsql security definer as $$
declare
  v_row record;
  v_session record;
  v_full_lp int;
begin
  insert into season_results (user_id, season_number, season_name, final_lp, final_rank, final_division, final_avg, final_high, total_games)
  select
    user_id, p_season_number, p_season_name, lp, rank, division, avg, high, total_games
  from player_rankings_cache
  where total_games > 0
  on conflict (user_id, season_number) do nothing;

  -- Soft reset becomes the next season's baseline
  insert into season_baselines (user_id, season_number, baseline_lp, updated_at)
  select
    user_id,
    p_season_number + 1,
    greatest(1200 + round((lp - 1200) * 0.3)::int, 0),
    now()
  from player_rankings_cache
  where total_games > 0
  on conflict (user_id) do update set
    season_number = excluded.season_number,
    baseline_lp = excluded.baseline_lp,
    updated_at = excluded.updated_at;

  -- Old deltas are meaningless after reset
  delete from session_lp_cache;

  -- Recompute rankings and current-season session deltas from baselines
  for v_row in select user_id from player_rankings_cache loop
    v_full_lp := refresh_player_ranking(v_row.user_id);

    for v_session in
      select distinct g.session_id
      from games g
      where g.user_id = v_row.user_id
        and g.created_at >= current_season_start()
    loop
      perform compute_session_delta(v_row.user_id, v_session.session_id, v_full_lp);
    end loop;
  end loop;
end;
$$;

-- 6. Backfill: end Season 1 using true Jun 30 values computed from game
-- history (the current cache includes post-Jun-30 games for some players,
-- so it can't be used as the freeze source).
do $$
declare
  v_cutoff timestamptz := '2026-06-30 23:59:59.999999+08';
  v_user record;
  v_session record;
  v_scores int[];
  v_weights numeric[];
  v_lp numeric;
  v_total int;
  v_avg int;
  v_high int;
  v_rank text;
  v_division text;
  v_tier_min int;
  v_tier_max int;
  v_full_lp int;
  i int;
begin
  -- Only backfill if Season 1 was never processed
  if exists (select 1 from season_results where season_number = 1) then
    return;
  end if;

  for v_user in
    select distinct g.user_id from games g where g.created_at <= v_cutoff
  loop
    select
      array_agg(g.total_score order by g.created_at desc),
      array_agg(
        case s.event_label
          when 'Tournament' then 1.5
          when 'Funbowl' then 1.35
          when 'League' then 1.25
          else 1.0
        end
        order by g.created_at desc
      )
    into v_scores, v_weights
    from games g
    join sessions s on s.id = g.session_id
    where g.user_id = v_user.user_id and g.created_at <= v_cutoff;

    v_total := array_length(v_scores, 1);
    v_avg := floor((select avg(unnest) from unnest(v_scores)));
    v_high := (select max(unnest) from unnest(v_scores));

    -- Season 1 LP: original lifetime formula (base 185)
    v_lp := 1200;
    for i in 1..v_total loop
      v_lp := v_lp + round(
        (v_scores[i] - 185) *
        case when (v_total - i) < 4 then 1.0 else v_weights[i] end *
        case when (v_total - i) < 4 then 5 else 1 end *
        greatest(0.25, 1.0 - (i - 1) * 0.0125)
      );
    end loop;
    v_lp := greatest(v_lp, 0);

    v_tier_min := null; v_tier_max := null; v_division := null;
    if v_lp >= 2600 then v_rank := 'Challenger';
    elsif v_lp >= 2400 then v_rank := 'Grandmaster';
    elsif v_lp >= 2200 then v_rank := 'Master';
    elsif v_lp >= 2000 then v_rank := 'Diamond'; v_tier_min := 2000; v_tier_max := 2200;
    elsif v_lp >= 1800 then v_rank := 'Emerald'; v_tier_min := 1800; v_tier_max := 2000;
    elsif v_lp >= 1600 then v_rank := 'Platinum'; v_tier_min := 1600; v_tier_max := 1800;
    elsif v_lp >= 1400 then v_rank := 'Gold'; v_tier_min := 1400; v_tier_max := 1600;
    elsif v_lp >= 1200 then v_rank := 'Silver'; v_tier_min := 1200; v_tier_max := 1400;
    elsif v_lp >= 1000 then v_rank := 'Bronze'; v_tier_min := 1000; v_tier_max := 1200;
    else v_rank := 'Iron'; v_tier_min := 0; v_tier_max := 1000;
    end if;

    if v_tier_min is not null then
      v_division := (array['IV','III','II','I'])[least(floor(
        (v_lp - v_tier_min)::numeric / (v_tier_max - v_tier_min) * 4
      )::int, 3) + 1];
    end if;

    insert into season_results (user_id, season_number, season_name, final_lp, final_rank, final_division, final_avg, final_high, total_games)
    values (v_user.user_id, 1, 'Season 1', round(v_lp)::int, v_rank, v_division, v_avg, v_high, v_total)
    on conflict (user_id, season_number) do nothing;

    insert into season_baselines (user_id, season_number, baseline_lp, updated_at)
    values (v_user.user_id, 2, greatest(1200 + round((v_lp - 1200) * 0.3)::int, 0), now())
    on conflict (user_id) do update set
      season_number = excluded.season_number,
      baseline_lp = excluded.baseline_lp,
      updated_at = excluded.updated_at;
  end loop;

  delete from session_lp_cache;

  -- Recompute all rankings under the new seasonal model
  for v_user in select distinct g.user_id from games g loop
    v_full_lp := refresh_player_ranking(v_user.user_id);

    for v_session in
      select distinct g.session_id
      from games g
      where g.user_id = v_user.user_id
        and g.created_at >= current_season_start()
    loop
      perform compute_session_delta(v_user.user_id, v_session.session_id, v_full_lp);
    end loop;
  end loop;
end;
$$;
