-- Returns LP delta for each session: how much LP that session contributed
-- Only for users with >= 4 games (calibrated)
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
  -- Process each session
  for v_session in
    select distinct s.id as session_id, s.user_id
    from sessions s
    where s.id = any(p_session_ids)
  loop
    v_user_id := v_session.user_id;

    -- Get all games for this user
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

    -- Get game IDs for this session
    select array_agg(g.id) into v_session_game_ids
    from games g where g.session_id = v_session.session_id;

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

    result := result || jsonb_build_object(
      v_session.session_id::text, round(v_full_lp - v_without_lp)::int
    );
  end loop;

  return result;
end;
$fn$;
