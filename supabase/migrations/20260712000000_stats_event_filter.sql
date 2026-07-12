-- Add optional event-type filter (League / Tournament / Funbowl / casual).
-- 'casual' matches sessions with no event label. Old 4-arg signatures dropped
-- to avoid overload ambiguity from the new defaulted parameter.
drop function if exists get_player_overview_stats(uuid, text, date, date);
drop function if exists get_player_leave_stats(uuid, text, date, date);
CREATE OR REPLACE FUNCTION public.get_player_overview_stats(p_user_id uuid, p_filter text DEFAULT 'all'::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_event text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  result jsonb;
begin
  with filtered_games as (
    select g.id, g.total_score, g.entry_type, g.is_clean,
           g.strike_count, g.spare_count, g.created_at
    from games g
    join sessions s on s.id = g.session_id
    where g.user_id = p_user_id
      and case
        when p_event is null then true
        when p_event = 'casual' then s.event_label is null
        else s.event_label = p_event
      end
      and case
        when p_filter = 'last10' then true
        when p_filter = 'last50' then true
        when p_filter = 'ytd' then s.session_date >= date_trunc('year', current_date)::date
        when p_filter = 'custom' then s.session_date between p_date_from and p_date_to
        else true
      end
    order by g.created_at asc
  ),
  sliced_games as (
    select * from (
      select *, row_number() over (order by created_at desc) as rn
      from filtered_games
    ) sub
    where case
      when p_filter = 'last10' then rn <= 10
      when p_filter = 'last50' then rn <= 50
      else true
    end
  ),
  game_stats as (
    select
      count(*)::int as total_games,
      coalesce(floor(avg(total_score))::int, 0) as avg_score,
      coalesce(max(total_score), 0) as high_score,
      coalesce(min(total_score), 0) as low_score,
      count(*) filter (where entry_type = 'detailed')::int as detailed_games,
      count(*) filter (where is_clean and entry_type = 'detailed')::int as clean_games
    from sliced_games
  ),
  filtered_frames as (
    select f.*
    from frames f
    where f.game_id in (select id from sliced_games)
  ),
  frame_stats as (
    select
      count(*) filter (where is_strike and frame_number <= 10)::int as strikes,
      (select detailed_games from game_stats) * 10 as total_frames_played,
      -- Spare opportunities: frames 1-9 non-strike + frame 10 non-strike R1 + frame 10 R1=X with R2<10
      (count(*) filter (where not is_strike and frame_number <= 9)
       + count(*) filter (where not is_strike and frame_number = 10)
       + count(*) filter (where is_strike and frame_number = 10 and roll_2 is not null and roll_2 < 10)
      )::int as spare_opportunities,
      -- Spares converted: frames 1-9 is_spare + frame 10 is_spare + frame 10 R1=X R2+R3=10
      (count(*) filter (where is_spare and not is_strike and frame_number <= 9)
       + count(*) filter (where is_spare and frame_number = 10)
       + count(*) filter (where is_strike and frame_number = 10 and roll_2 is not null and roll_2 < 10 and roll_3 is not null and roll_2 + roll_3 = 10)
      )::int as spares_converted,
      count(*) filter (where frame_number <= 10)::int as first_ball_frames,
      count(*) filter (
        where frame_number <= 10
        and (is_strike or (pins_remaining is not null and jsonb_array_length(pins_remaining) = 1))
      )::int as pocket_hits
    from filtered_frames
  ),
  double_calc as (
    select
      coalesce(sum(case when prev_strike and is_strike then 1 else 0 end), 0)::int as doubles,
      coalesce(sum(case when prev_strike then 1 else 0 end), 0)::int as double_opportunities
    from (
      select is_strike,
             lag(is_strike) over (partition by game_id order by frame_number) as prev_strike
      from filtered_frames
    ) sub
    where prev_strike is not null
  ),
  spare_streak_calc as (
    select coalesce(max(streak_len), 0)::int as max_spare_streak
    from (
      select count(*) as streak_len
      from (
        select spare_converted, is_strike,
               sum(case when not spare_converted and not is_strike then 1 else 0 end)
                 over (order by game_id, frame_number rows unbounded preceding) as grp
        from filtered_frames
      ) sub
      where spare_converted
      group by grp
    ) streaks
  ),
  spare_trend as (
    select coalesce(jsonb_agg(pct order by g_created), '[]'::jsonb) as spare_conv_trend
    from (
      select
        sg.created_at as g_created,
        round(
          -- Numerator: all spares including frame 10
          (count(*) filter (where f.is_spare)
           + count(*) filter (where f.is_strike and f.frame_number = 10 and f.roll_2 is not null and f.roll_2 < 10 and f.roll_3 is not null and f.roll_2 + f.roll_3 = 10)
          )::numeric /
          -- Denominator: all spare opportunities including frame 10
          nullif(
            count(*) filter (where not f.is_strike and f.frame_number <= 9)
            + count(*) filter (where not f.is_strike and f.frame_number = 10)
            + count(*) filter (where f.is_strike and f.frame_number = 10 and f.roll_2 is not null and f.roll_2 < 10),
            0
          ) * 100
        )::int as pct
      from sliced_games sg
      join filtered_frames f on f.game_id = sg.id
      where sg.entry_type = 'detailed'
      group by sg.id, sg.created_at
      having (
        count(*) filter (where not f.is_strike and f.frame_number <= 9)
        + count(*) filter (where not f.is_strike and f.frame_number = 10)
        + count(*) filter (where f.is_strike and f.frame_number = 10 and f.roll_2 is not null and f.roll_2 < 10)
      ) > 0
    ) sub
  ),
  score_trend as (
    select
      coalesce(jsonb_agg(total_score order by created_at asc), '[]'::jsonb) as scores,
      coalesce(jsonb_agg(is_clean order by created_at asc), '[]'::jsonb) as clean_flags
    from sliced_games
  )
  select jsonb_build_object(
    'total_games', gs.total_games,
    'avg', gs.avg_score,
    'high', gs.high_score,
    'low', gs.low_score,
    'detailed_games', gs.detailed_games,
    'clean_games', gs.clean_games,
    'clean_rate', case when gs.detailed_games > 0
      then round(gs.clean_games::numeric / gs.detailed_games * 100)::int else 0 end,
    'strikes', fs.strikes,
    'total_frames_played', fs.total_frames_played,
    'strike_rate', case when fs.total_frames_played > 0
      then round(fs.strikes::numeric / fs.total_frames_played * 100)::int else 0 end,
    'spare_opportunities', fs.spare_opportunities,
    'spares_converted', fs.spares_converted,
    'spare_rate', case when fs.spare_opportunities > 0
      then round(fs.spares_converted::numeric / fs.spare_opportunities * 100)::int else 0 end,
    'first_ball_frames', fs.first_ball_frames,
    'pocket_hits', fs.pocket_hits,
    'pocket_rate', case when fs.first_ball_frames > 0
      then round(fs.pocket_hits::numeric / fs.first_ball_frames * 100)::int else 0 end,
    'doubles', dc.doubles,
    'double_opportunities', dc.double_opportunities,
    'double_rate', case when dc.double_opportunities > 0
      then round(dc.doubles::numeric / dc.double_opportunities * 100)::int else 0 end,
    'max_spare_streak', ss.max_spare_streak,
    'spare_conv_trend', st.spare_conv_trend,
    'scores', sctr.scores,
    'clean_flags', sctr.clean_flags
  ) into result
  from game_stats gs
  cross join frame_stats fs
  cross join double_calc dc
  cross join spare_streak_calc ss
  cross join spare_trend st
  cross join score_trend sctr;

  return coalesce(result, '{}'::jsonb);
end;
$function$

;
CREATE OR REPLACE FUNCTION public.get_player_leave_stats(p_user_id uuid, p_filter text DEFAULT 'all'::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_event text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  result jsonb;
begin
  with filtered_games as (
    select g.id, g.created_at
    from games g
    join sessions s on s.id = g.session_id
    where g.user_id = p_user_id
      and case
        when p_event is null then true
        when p_event = 'casual' then s.event_label is null
        else s.event_label = p_event
      end
      and g.entry_type = 'detailed'
      and case
        when p_filter = 'ytd' then s.session_date >= date_trunc('year', current_date)::date
        when p_filter = 'custom' then s.session_date between p_date_from and p_date_to
        else true
      end
    order by g.created_at asc
  ),
  sliced_games as (
    select id from (
      select id, row_number() over (order by created_at desc) as rn
      from filtered_games
    ) sub
    where case
      when p_filter = 'last10' then rn <= 10
      when p_filter = 'last50' then rn <= 50
      else true
    end
  ),
  spare_opps as (
    select
      f.pins_remaining,
      f.spare_converted,
      (select jsonb_agg(v order by v) from jsonb_array_elements(f.pins_remaining) v) as sorted_pins
    from frames f
    where f.game_id in (select id from sliced_games)
      and not f.is_strike
      and f.pins_remaining is not null
      and jsonb_array_length(f.pins_remaining) > 0
  ),
  leave_groups as (
    select
      sorted_pins::text as leave_key,
      sorted_pins as pins,
      count(*)::int as attempts,
      count(*) filter (where spare_converted)::int as converted,
      case
        when jsonb_array_length(sorted_pins) = 1 then 'single'
        when is_split(sorted_pins) then 'split'
        else 'multi'
      end as category
    from spare_opps
    group by sorted_pins
  ),
  category_stats as (
    select
      category,
      sum(attempts)::int as attempts,
      sum(converted)::int as converted
    from leave_groups
    group by category
  ),
  all_leaves_sorted as (
    select *, (attempts - converted) as missed
    from leave_groups
    order by missed desc, (converted::numeric / nullif(attempts, 0)) asc
  ),
  targets as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'pins', pins,
      'attempts', attempts,
      'converted', converted,
      'category', category
    )), '[]'::jsonb) as practice_targets
    from (select * from all_leaves_sorted where attempts >= 2 limit 3) sub
  ),
  most_missed as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'pins', pins,
      'attempts', attempts,
      'converted', converted,
      'category', category
    )), '[]'::jsonb) as items
    from (
      select * from all_leaves_sorted
      where category != 'split' and attempts >= 2
      limit 5
    ) sub
  ),
  leaves_by_cat as (
    select
      category,
      jsonb_agg(jsonb_build_object(
        'pins', pins,
        'attempts', attempts,
        'converted', converted,
        'rate', case when attempts > 0
          then round(converted::numeric / attempts * 100)::int else 0 end
      ) order by (attempts - converted) desc) as leaves
    from leave_groups
    group by category
  )
  select jsonb_build_object(
    'total_spare_opportunities',
      (select count(*)::int from spare_opps),
    'total_spares_converted',
      (select count(*) filter (where spare_converted)::int from spare_opps),
    'spare_rate',
      case when (select count(*) from spare_opps) > 0
        then round((select count(*) filter (where spare_converted) from spare_opps)::numeric /
             (select count(*) from spare_opps) * 100)::int else 0 end,
    'single_pin', coalesce(
      (select jsonb_build_object('attempts', attempts, 'converted', converted,
        'rate', case when attempts > 0 then round(converted::numeric / attempts * 100)::int else 0 end)
       from category_stats where category = 'single'),
      '{"attempts":0,"converted":0,"rate":0}'::jsonb),
    'multi_pin', coalesce(
      (select jsonb_build_object('attempts', attempts, 'converted', converted,
        'rate', case when attempts > 0 then round(converted::numeric / attempts * 100)::int else 0 end)
       from category_stats where category = 'multi'),
      '{"attempts":0,"converted":0,"rate":0}'::jsonb),
    'splits', coalesce(
      (select jsonb_build_object('attempts', attempts, 'converted', converted,
        'rate', case when attempts > 0 then round(converted::numeric / attempts * 100)::int else 0 end)
       from category_stats where category = 'split'),
      '{"attempts":0,"converted":0,"rate":0}'::jsonb),
    'single_pin_leaves', coalesce((select leaves from leaves_by_cat where category = 'single'), '[]'::jsonb),
    'multi_pin_leaves', coalesce((select leaves from leaves_by_cat where category = 'multi'), '[]'::jsonb),
    'split_leaves', coalesce((select leaves from leaves_by_cat where category = 'split'), '[]'::jsonb),
    'practice_targets', (select practice_targets from targets),
    'most_missed', (select items from most_missed)
  ) into result;

  return coalesce(result, '{}'::jsonb);
end;
$function$

;
