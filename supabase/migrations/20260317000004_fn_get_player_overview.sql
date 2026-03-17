create or replace function get_player_overview_stats(
  p_user_id uuid,
  p_filter text default 'all',
  p_date_from date default null,
  p_date_to date default null
) returns jsonb
language plpgsql stable security invoker as $$
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
      coalesce(round(avg(total_score))::int, 0) as avg_score,
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
      count(*) filter (where not is_strike and frame_number <= 9)::int as spare_opportunities,
      count(*) filter (where is_spare and not is_strike and frame_number <= 9)::int as spares_converted,
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
          count(*) filter (where f.is_spare)::numeric /
          nullif(count(*) filter (where not f.is_strike and f.frame_number <= 9), 0) * 100
        )::int as pct
      from sliced_games sg
      join filtered_frames f on f.game_id = sg.id
      where sg.entry_type = 'detailed'
      group by sg.id, sg.created_at
      having count(*) filter (where not f.is_strike and f.frame_number <= 9) > 0
    ) sub
  ),
  score_trend as (
    select coalesce(jsonb_agg(total_score order by created_at asc), '[]'::jsonb) as scores
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
    'scores', sctr.scores
  ) into result
  from game_stats gs
  cross join frame_stats fs
  cross join double_calc dc
  cross join spare_streak_calc ss
  cross join spare_trend st
  cross join score_trend sctr;

  return coalesce(result, '{}'::jsonb);
end;
$$;
