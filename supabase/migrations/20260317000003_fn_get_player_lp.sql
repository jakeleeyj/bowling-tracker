create or replace function get_player_lp(p_user_id uuid)
returns jsonb
language plpgsql stable security invoker as $$
declare
  v_lp numeric := 1200;
  v_total_games int;
  v_scores int[];
  v_weights numeric[];
  v_score int;
  v_weight numeric;
  v_recency numeric;
  v_multiplier numeric;
  v_gain numeric;
  i int;
  v_rank text;
  v_division text;
  v_tier_min int;
  v_tier_max int;
  v_avg int;
  v_high int;
  v_progress numeric;
  v_band int;
begin
  -- Gather scores newest-first with event weights
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

  v_total_games := coalesce(array_length(v_scores, 1), 0);

  if v_total_games = 0 then
    return jsonb_build_object('lp', 0, 'total_games', 0, 'rank', 'Iron',
      'division', 'IV', 'avg', 0, 'high', 0);
  end if;

  -- Process games: scores are newest-first
  -- i=1 is newest, i=v_total_games is oldest
  for i in 1..v_total_games loop
    v_score := v_scores[i];
    v_weight := v_weights[i];

    -- Recency: linear decay from 1.0 to 0.25 over 60 games
    v_recency := greatest(0.25, 1.0 - (i - 1) * 0.0125);

    -- Calibration: oldest 4 games get 5x multiplier, no event weight
    -- chronological index from oldest = v_total_games - i (0-based)
    if (v_total_games - i) < 4 then
      v_multiplier := 5;
      v_weight := 1.0; -- ignore event weight during calibration
    else v_multiplier := 1;
    end if;

    v_gain := round((v_score - 180) * v_weight * v_multiplier * v_recency);
    v_lp := v_lp + v_gain;
  end loop;

  v_lp := greatest(v_lp, 0);

  -- Compute stats
  v_avg := floor((select avg(unnest) from unnest(v_scores)));
  v_high := (select max(unnest) from unnest(v_scores));

  -- Determine tier
  if v_lp >= 2600 then v_rank := 'Challenger'; v_division := null;
  elsif v_lp >= 2400 then v_rank := 'Grandmaster'; v_division := null;
  elsif v_lp >= 2200 then v_rank := 'Master'; v_division := null;
  elsif v_lp >= 2000 then v_rank := 'Diamond'; v_tier_min := 2000; v_tier_max := 2200;
  elsif v_lp >= 1800 then v_rank := 'Emerald'; v_tier_min := 1800; v_tier_max := 2000;
  elsif v_lp >= 1600 then v_rank := 'Platinum'; v_tier_min := 1600; v_tier_max := 1800;
  elsif v_lp >= 1400 then v_rank := 'Gold'; v_tier_min := 1400; v_tier_max := 1600;
  elsif v_lp >= 1200 then v_rank := 'Silver'; v_tier_min := 1200; v_tier_max := 1400;
  elsif v_lp >= 1000 then v_rank := 'Bronze'; v_tier_min := 1000; v_tier_max := 1200;
  else v_rank := 'Iron'; v_tier_min := 0; v_tier_max := 1000;
  end if;

  -- Divisions: IV (lowest) to I (highest), 4 equal bands
  if v_division is null and v_tier_min is not null then
    v_progress := (v_lp - v_tier_min)::numeric / (v_tier_max - v_tier_min);
    v_band := floor(v_progress * 4);
    if v_band >= 4 then v_band := 3; end if;
    v_division := (array['IV', 'III', 'II', 'I'])[v_band + 1];
  end if;

  return jsonb_build_object(
    'lp', round(v_lp)::int,
    'total_games', v_total_games,
    'rank', v_rank,
    'division', v_division,
    'avg', v_avg,
    'high', v_high
  );
end;
$$;
