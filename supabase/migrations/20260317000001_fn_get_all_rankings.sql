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
      v_progress := round((v_lp - v_tier_min)::numeric / (v_tier_max - v_tier_min) * 100)::int;
      v_division := (array['IV','III','II','I'])[least(floor(
        (v_lp - v_tier_min)::numeric / (v_tier_max - v_tier_min) * 4
      )::int, 3) + 1];
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
