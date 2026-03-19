-- Change LP base score from 180 to 185
-- Sub-185 games now lose LP, making ranks harder to inflate

-- Update refresh_player_ranking
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
        (v_scores[i] - 185) *
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

-- Update compute_session_delta
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
        (v_scores_without[i] - 185) *
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

-- Re-seed all caches with new base
do $$
declare
  v_user record;
  v_session record;
  v_full_lp int;
  v_total int;
begin
  for v_user in select id from profiles loop
    v_full_lp := refresh_player_ranking(v_user.id);
    select count(*)::int into v_total from games where user_id = v_user.id;
    if v_total >= 4 then
      for v_session in
        select distinct s.id as session_id
        from sessions s join games g on g.session_id = s.id
        where s.user_id = v_user.id
      loop
        perform compute_session_delta(v_user.id, v_session.session_id, v_full_lp);
      end loop;
    else
      delete from session_lp_cache where user_id = v_user.id;
    end if;
  end loop;
end;
$$;
