-- Update LP functions: no event weight during calibration, linear recency decay

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

  for i in 1..v_total_games loop
    v_score := v_scores[i];
    v_weight := v_weights[i];

    v_recency := greatest(0.25, 1.0 - (i - 1) * 0.0125);

    if (v_total_games - i) < 4 then
      v_multiplier := 5;
      v_weight := 1.0;
    else v_multiplier := 1;
    end if;

    v_gain := round((v_score - 180) * v_weight * v_multiplier * v_recency);
    v_lp := v_lp + v_gain;
  end loop;

  v_lp := greatest(v_lp, 0);

  v_avg := floor((select avg(unnest) from unnest(v_scores)));
  v_high := (select max(unnest) from unnest(v_scores));

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

create or replace function get_all_rankings()
returns jsonb
language plpgsql stable security invoker as $fn$
declare
  result jsonb := '[]'::jsonb;
  v_user record;
  v_scores int[];
  v_weights numeric[];
  v_lp numeric;
  v_total int;
  v_rank text;
  v_division text;
  v_tier_min int;
  v_tier_max int;
  v_progress int;
  v_trend text;
  v_avg int;
  v_high int;
  i int;
begin
  for v_user in select id as user_id from profiles loop
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
    where g.user_id = v_user.user_id;

    v_total := coalesce(array_length(v_scores, 1), 0);

    if v_total = 0 then
      result := result || jsonb_build_object(
        'user_id', v_user.user_id,
        'lp', 0, 'total_games', 0, 'avg', 0, 'high', 0,
        'trend', 'stable', 'rank', 'Iron', 'division', 'IV', 'progress', 0
      );
      continue;
    end if;

    v_avg := floor((select avg(unnest) from unnest(v_scores)));
    v_high := (select max(unnest) from unnest(v_scores));

    v_lp := 1200;
    for i in 1..v_total loop
      v_lp := v_lp + round(
        (v_scores[i] - 180) *
        case when (v_total - i) < 4 then 1.0 else v_weights[i] end *
        case when (v_total - i) < 4 then 5 else 1 end *
        greatest(0.25, 1.0 - (i - 1) * 0.0125)
      );
    end loop;
    v_lp := greatest(v_lp, 0);

    v_trend := 'stable';
    if v_total >= 10 then
      if (v_scores[1]+v_scores[2]+v_scores[3]+v_scores[4]+v_scores[5])::numeric/5 -
         (v_scores[6]+v_scores[7]+v_scores[8]+v_scores[9]+v_scores[10])::numeric/5 > 5 then
        v_trend := 'up';
      elsif (v_scores[6]+v_scores[7]+v_scores[8]+v_scores[9]+v_scores[10])::numeric/5 -
            (v_scores[1]+v_scores[2]+v_scores[3]+v_scores[4]+v_scores[5])::numeric/5 > 5 then
        v_trend := 'down';
      end if;
    end if;

    v_tier_min := null;
    v_tier_max := null;
    v_division := null;
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

    v_progress := 0;
    if v_tier_min is not null then
      v_division := (array['IV','III','II','I'])[least(floor(
        (v_lp - v_tier_min)::numeric / (v_tier_max - v_tier_min) * 4
      )::int, 3) + 1];
      -- Progress within current division (50 LP band), matching client getDivisionProgress
      declare
        v_div_size numeric := (v_tier_max - v_tier_min)::numeric / 4;
        v_within_div numeric := ((v_lp - v_tier_min)::numeric) % v_div_size;
      begin
        v_progress := least(round(v_within_div / v_div_size * 100)::int, 100);
      end;
    end if;

    result := result || jsonb_build_object(
      'user_id', v_user.user_id,
      'lp', round(v_lp)::int,
      'total_games', v_total,
      'avg', v_avg,
      'high', v_high,
      'trend', v_trend,
      'rank', v_rank,
      'division', v_division,
      'progress', v_progress
    );
  end loop;

  return result;
end;
$fn$;

create or replace function get_session_lp_deltas(p_session_ids uuid[])
returns jsonb
language plpgsql stable security invoker as $fn$
declare
  result jsonb := '{}'::jsonb;
  v_session record;
  v_user_id uuid;
  v_full_lp numeric;
  v_without_lp numeric;
  v_scores int[];
  v_weights numeric[];
  v_scores_without int[];
  v_weights_without numeric[];
  v_session_game_ids uuid[];
  i int;
  v_total int;
begin
  for v_session in
    select distinct s.id as session_id, s.user_id
    from sessions s
    where s.id = any(p_session_ids)
  loop
    v_user_id := v_session.user_id;

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
    into v_scores, v_weights
    from games g
    join sessions ses on ses.id = g.session_id
    where g.user_id = v_user_id;

    v_total := coalesce(array_length(v_scores, 1), 0);
    if v_total < 4 then continue; end if;

    v_full_lp := 1200;
    for i in 1..v_total loop
      v_full_lp := v_full_lp + round(
        (v_scores[i] - 180) *
        case when (v_total - i) < 4 then 1.0 else v_weights[i] end *
        case when (v_total - i) < 4 then 5 else 1 end *
        greatest(0.25, 1.0 - (i - 1) * 0.0125)
      );
    end loop;
    v_full_lp := greatest(v_full_lp, 0);

    select array_agg(g.id) into v_session_game_ids
    from games g where g.session_id = v_session.session_id;

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
    where g.user_id = v_user_id
      and g.id != all(v_session_game_ids);

    if array_length(v_scores_without, 1) is null or array_length(v_scores_without, 1) = 0 then
      v_without_lp := 0;
    else
      v_without_lp := 1200;
      for i in 1..array_length(v_scores_without, 1) loop
        v_without_lp := v_without_lp + round(
          (v_scores_without[i] - 180) *
          case when (array_length(v_scores_without, 1) - i) < 4 then 1.0 else v_weights_without[i] end *
          case when (array_length(v_scores_without, 1) - i) < 4 then 5 else 1 end *
          greatest(0.25, 1.0 - (i - 1) * 0.0125)
        );
      end loop;
      v_without_lp := greatest(v_without_lp, 0);
    end if;

    result := result || jsonb_build_object(
      v_session.session_id::text, round(v_full_lp - v_without_lp)::int
    );
  end loop;

  return result;
end;
$fn$;
