-- 1. Make refresh_player_ranking return the computed LP (avoids double calculation)
create or replace function refresh_player_ranking(p_user_id uuid)
returns int
language plpgsql security definer as $$
declare
  v_scores int[];
  v_weights numeric[];
  v_lp numeric := 1200;
  v_total int;
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
  where g.user_id = p_user_id;

  v_total := coalesce(array_length(v_scores, 1), 0);

  if v_total > 0 then
    v_avg := floor((select avg(unnest) from unnest(v_scores)));
    v_high := (select max(unnest) from unnest(v_scores));

    for i in 1..v_total loop
      v_lp := v_lp + round(
        (v_scores[i] - 180) *
        case when (v_total - i) < 4 then 1.0 else v_weights[i] end *
        case when (v_total - i) < 4 then 5 else 1 end *
        greatest(0.25, 1.0 - (i - 1) * 0.0125)
      );
    end loop;
    v_lp := greatest(v_lp, 0);

    if v_total >= 10 then
      if (v_scores[1]+v_scores[2]+v_scores[3]+v_scores[4]+v_scores[5])::numeric/5 -
         (v_scores[6]+v_scores[7]+v_scores[8]+v_scores[9]+v_scores[10])::numeric/5 > 5 then
        v_trend := 'up';
      elsif (v_scores[6]+v_scores[7]+v_scores[8]+v_scores[9]+v_scores[10])::numeric/5 -
            (v_scores[1]+v_scores[2]+v_scores[3]+v_scores[4]+v_scores[5])::numeric/5 > 5 then
        v_trend := 'down';
      end if;
    end if;
  else
    v_lp := 0;
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

-- 2. Helper: compute session LP delta given the full LP (avoids refetching all games)
create or replace function compute_session_delta(p_user_id uuid, p_session_id uuid, p_full_lp int)
returns void
language plpgsql security definer as $$
declare
  v_scores_without int[];
  v_weights_without numeric[];
  v_without_lp numeric;
  v_total_without int;
  i int;
begin
  -- Get all games EXCEPT this session's
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
    and g.session_id != p_session_id;

  v_total_without := coalesce(array_length(v_scores_without, 1), 0);

  if v_total_without = 0 then
    v_without_lp := 0;
  else
    v_without_lp := 1200;
    for i in 1..v_total_without loop
      v_without_lp := v_without_lp + round(
        (v_scores_without[i] - 180) *
        case when (v_total_without - i) < 4 then 1.0 else v_weights_without[i] end *
        case when (v_total_without - i) < 4 then 5 else 1 end *
        greatest(0.25, 1.0 - (i - 1) * 0.0125)
      );
    end loop;
    v_without_lp := greatest(v_without_lp, 0);
  end if;

  insert into session_lp_cache (session_id, user_id, lp_delta, updated_at)
  values (p_session_id, p_user_id, p_full_lp - round(v_without_lp)::int, now())
  on conflict (session_id) do update set
    lp_delta = excluded.lp_delta, updated_at = excluded.updated_at;
end;
$$;

-- 3. Drop old row-level trigger
drop trigger if exists trg_refresh_player_cache on games;

-- 4. Statement-level trigger for INSERT (fires once per INSERT statement, not per row)
create or replace function trigger_refresh_cache_on_insert()
returns trigger
language plpgsql security definer as $$
declare
  v_rec record;
  v_full_lp int;
  v_total int;
begin
  for v_rec in
    select distinct user_id, session_id from new_rows
  loop
    -- Refresh ranking once per user (returns LP)
    v_full_lp := refresh_player_ranking(v_rec.user_id);

    -- Check if calibrated
    select count(*)::int into v_total from games where user_id = v_rec.user_id;
    if v_total >= 4 then
      perform compute_session_delta(v_rec.user_id, v_rec.session_id, v_full_lp);
    else
      delete from session_lp_cache where session_id = v_rec.session_id;
    end if;
  end loop;
  return null;
end;
$$;

create trigger trg_refresh_cache_insert
  after insert on games
  referencing new table as new_rows
  for each statement
  execute function trigger_refresh_cache_on_insert();

-- 5. Statement-level trigger for DELETE (cascade from session delete)
create or replace function trigger_refresh_cache_on_delete()
returns trigger
language plpgsql security definer as $$
declare
  v_rec record;
begin
  for v_rec in
    select distinct user_id from old_rows
  loop
    perform refresh_player_ranking(v_rec.user_id);
    -- Session LP cache entries are cascade-deleted with the session
  end loop;
  return null;
end;
$$;

create trigger trg_refresh_cache_delete
  after delete on games
  referencing old table as old_rows
  for each statement
  execute function trigger_refresh_cache_on_delete();

-- 6. Row-level trigger for UPDATE (rare, keep simple)
create or replace function trigger_refresh_cache_on_update()
returns trigger
language plpgsql security definer as $$
declare
  v_full_lp int;
  v_total int;
begin
  v_full_lp := refresh_player_ranking(new.user_id);
  select count(*)::int into v_total from games where user_id = new.user_id;
  if v_total >= 4 then
    perform compute_session_delta(new.user_id, new.session_id, v_full_lp);
  end if;
  return new;
end;
$$;

create trigger trg_refresh_cache_update
  after update on games
  for each row
  execute function trigger_refresh_cache_on_update();

-- 7. Fix achievement stats: replace O(n²) correlated subqueries with single-pass window functions
create or replace function get_player_achievement_stats(p_user_id uuid)
returns jsonb
language plpgsql stable security invoker as $$
declare
  result jsonb;
begin
  with game_stats as (
    select g.id as game_id, g.session_id, g.total_score, g.is_clean,
           g.strike_count, g.spare_count
    from games g where g.user_id = p_user_id
  ),
  agg_stats as (
    select
      count(*)::int as total_games,
      count(distinct session_id)::int as total_sessions,
      coalesce(max(total_score), 0) as high_game,
      count(*) filter (where is_clean)::int as clean_games,
      bool_or(total_score >= 200) as has_200_game,
      bool_or(total_score >= 250) as has_250_game,
      bool_or(total_score = 149) as has_149_game,
      coalesce(sum(strike_count), 0)::int as total_strikes,
      coalesce(sum(spare_count), 0)::int as total_spares
    from game_stats
  ),
  session_game_counts as (
    select max(cnt)::int as max_games_in_session
    from (select session_id, count(*)::int as cnt from game_stats group by session_id) sub
  ),
  -- Single-pass streak detection using window functions (no correlated subqueries)
  game_frames as (
    select f.game_id, f.frame_number, f.is_strike, f.is_spare,
           f.spare_converted, f.pins_remaining
    from frames f
    where f.game_id in (select game_id from game_stats)
  ),
  frame_groups as (
    select
      game_id, frame_number, is_strike, is_spare, spare_converted, pins_remaining,
      -- Strike group: assign a group ID that changes when is_strike changes
      sum(case when is_strike then 0 else 1 end) over (
        partition by game_id order by frame_number
      ) as strike_grp,
      -- Spare group: for consecutive spare conversions (skipping strikes)
      case when not is_strike then
        sum(case when not is_strike and not spare_converted then 1 else 0 end) over (
          partition by game_id order by frame_number
        )
      else null end as spare_grp
    from game_frames
  ),
  streaks as (
    select
      game_id,
      -- Max consecutive strikes: count frames per strike group where is_strike
      max(strike_run) as max_strike_streak,
      max(spare_run) as max_spare_streak
    from (
      select game_id,
        case when is_strike then count(*) over (partition by game_id, strike_grp) else 0 end as strike_run,
        case when spare_converted and not is_strike then
          count(*) over (partition by game_id, spare_grp)
        else 0 end as spare_run
      from frame_groups
    ) sub
    group by game_id
  ),
  split_stats as (
    select
      game_id,
      count(*) filter (where pins_remaining is not null
        and jsonb_array_length(pins_remaining) >= 2
        and is_split(pins_remaining))::int as split_count,
      count(*) filter (where pins_remaining is not null
        and jsonb_array_length(pins_remaining) = 2
        and pins_remaining @> '[7]'::jsonb
        and pins_remaining @> '[10]'::jsonb)::int as count_710,
      bool_or(
        pins_remaining is not null
        and jsonb_array_length(pins_remaining) >= 2
        and is_split(pins_remaining)
        and (is_spare or spare_converted)
      ) as has_split_spare
    from game_frames
    group by game_id
  ),
  per_game as (
    select
      coalesce(max(s.max_strike_streak), 0)::int as max_consecutive_strikes,
      coalesce(max(s.max_spare_streak), 0)::int as max_consecutive_spares,
      coalesce(max(sp.split_count), 0)::int as max_splits_in_game,
      coalesce(max(sp.count_710), 0)::int as max_710_in_game,
      bool_or(sp.has_split_spare) as has_split_spare
    from game_stats gs
    left join streaks s on s.game_id = gs.game_id
    left join split_stats sp on sp.game_id = gs.game_id
  )
  select jsonb_build_object(
    'highGame', a.high_game,
    'totalGames', a.total_games,
    'totalSessions', a.total_sessions,
    'cleanGames', a.clean_games,
    'maxConsecutiveStrikes', pg.max_consecutive_strikes,
    'maxConsecutiveSpares', pg.max_consecutive_spares,
    'has200Game', coalesce(a.has_200_game, false),
    'has250Game', coalesce(a.has_250_game, false),
    'has149Game', coalesce(a.has_149_game, false),
    'totalStrikes', a.total_strikes,
    'totalSpares', a.total_spares,
    'gamesInSingleSession', coalesce(sgc.max_games_in_session, 0),
    'maxSplitsInGame', pg.max_splits_in_game,
    'max710InGame', pg.max_710_in_game,
    'hasSplitSpare', coalesce(pg.has_split_spare, false)
  ) into result
  from agg_stats a
  cross join session_game_counts sgc
  cross join per_game pg;

  return coalesce(result, '{}'::jsonb);
end;
$$;
