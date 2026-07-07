-- Add season-scoped avg + game count to the rankings cache.
-- Leaderboard shows current-season stats; home/profile keep lifetime stats.

alter table player_rankings_cache
  add column if not exists season_avg int not null default 0,
  add column if not exists season_games int not null default 0;

-- Recompute season_avg / season_games alongside the existing fields
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
  v_season_avg int := 0;
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

  -- Current-season scores + weights (LP, season stats)
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

  insert into player_rankings_cache (user_id, lp, total_games, avg, high, rank, division, trend, progress, season_avg, season_games, updated_at)
  values (p_user_id, round(v_lp)::int, v_total, v_avg, v_high, v_rank, v_division, v_trend, v_progress, v_season_avg, v_season_total, now())
  on conflict (user_id) do update set
    lp = excluded.lp, total_games = excluded.total_games, avg = excluded.avg,
    high = excluded.high, rank = excluded.rank, division = excluded.division,
    trend = excluded.trend, progress = excluded.progress,
    season_avg = excluded.season_avg, season_games = excluded.season_games,
    updated_at = excluded.updated_at;

  return round(v_lp)::int;
end;
$$;

-- Expose season stats on the leaderboard payload
create or replace function get_all_rankings()
returns jsonb
language plpgsql stable security invoker as $fn$
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'user_id', r.user_id,
      'lp', r.lp,
      'total_games', r.total_games,
      'avg', r.avg,
      'high', r.high,
      'trend', r.trend,
      'rank', r.rank,
      'division', r.division,
      'progress', r.progress,
      'season_avg', r.season_avg,
      'season_games', r.season_games
    ) order by r.lp desc), '[]'::jsonb)
    from player_rankings_cache r
  );
end;
$fn$;

-- Reseed so the new columns are populated immediately
do $$
declare
  v_user record;
begin
  for v_user in select id from profiles loop
    perform refresh_player_ranking(v_user.id);
  end loop;
end;
$$;
