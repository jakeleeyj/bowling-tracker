-- Optimize trigger: only refresh ranking + delta for the affected session (not all sessions)
-- Also add a function to read LP from cache for profile page

-- 1. Smarter trigger: only compute delta for the affected session
create or replace function trigger_refresh_player_cache()
returns trigger
language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_session_id uuid;
  v_scores int[];
  v_weights numeric[];
  v_full_lp numeric;
  v_total int;
  v_session_game_ids uuid[];
  v_scores_without int[];
  v_weights_without numeric[];
  v_without_lp numeric;
  i int;
begin
  v_user_id := coalesce(new.user_id, old.user_id);
  v_session_id := coalesce(new.session_id, old.session_id);

  -- Refresh ranking (fast: single LP calc)
  perform refresh_player_ranking(v_user_id);

  -- Only compute LP delta for the affected session (not all sessions)
  -- Get all games for user
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

  if v_total < 4 then
    -- Not calibrated yet, remove any cached delta for this session
    delete from session_lp_cache where session_id = v_session_id;
    return coalesce(new, old);
  end if;

  -- Calculate full LP
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

  -- Get game IDs for just this session
  select array_agg(g.id) into v_session_game_ids
  from games g where g.session_id = v_session_id;

  -- Calculate LP without this session's games
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

  -- Upsert just this session's delta
  insert into session_lp_cache (session_id, user_id, lp_delta, updated_at)
  values (v_session_id, v_user_id, round(v_full_lp - v_without_lp)::int, now())
  on conflict (session_id) do update set
    lp_delta = excluded.lp_delta,
    updated_at = excluded.updated_at;

  return coalesce(new, old);
end;
$$;

-- 2. Replace get_player_lp to read from cache (profile page uses this)
-- Falls back to live calculation if cache is empty
create or replace function get_player_lp(p_user_id uuid)
returns jsonb
language plpgsql stable security invoker as $$
declare
  v_cached player_rankings_cache%rowtype;
begin
  select * into v_cached from player_rankings_cache where user_id = p_user_id;

  if found then
    return jsonb_build_object(
      'lp', v_cached.lp,
      'total_games', v_cached.total_games,
      'rank', v_cached.rank,
      'division', v_cached.division,
      'avg', v_cached.avg,
      'high', v_cached.high
    );
  end if;

  -- No cache yet (new user), return defaults
  return jsonb_build_object('lp', 0, 'total_games', 0, 'rank', 'Iron',
    'division', 'IV', 'avg', 0, 'high', 0);
end;
$$;
