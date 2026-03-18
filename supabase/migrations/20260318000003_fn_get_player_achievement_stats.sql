-- Compute achievement stats server-side instead of fetching all games+frames to client
create or replace function get_player_achievement_stats(p_user_id uuid)
returns jsonb
language plpgsql stable security invoker as $$
declare
  result jsonb;
begin
  with game_stats as (
    select
      g.id as game_id,
      g.session_id,
      g.total_score,
      g.is_clean,
      g.strike_count,
      g.spare_count
    from games g
    where g.user_id = p_user_id
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
    from (
      select session_id, count(*)::int as cnt
      from game_stats
      group by session_id
    ) sub
  ),
  -- Ordered frames per game for streak calculation
  game_frames as (
    select
      f.game_id,
      f.frame_number,
      f.is_strike,
      f.is_spare,
      f.spare_converted,
      f.pins_remaining
    from frames f
    where f.game_id in (select game_id from game_stats)
    order by f.game_id, f.frame_number
  ),
  -- Per-game streak and split stats
  per_game_stats as (
    select
      game_id,
      max(strike_streak) as max_strike_streak,
      max(spare_streak) as max_spare_streak,
      sum(case when is_split_leave then 1 else 0 end)::int as split_count,
      sum(case when is_710 then 1 else 0 end)::int as count_710,
      bool_or(is_split_leave and (is_spare or spare_converted)) as has_split_spare
    from (
      select
        game_id,
        is_strike,
        is_spare,
        spare_converted,
        pins_remaining,
        -- Strike streak: count consecutive strikes ending at this frame
        case when is_strike then
          frame_number - coalesce(
            (select max(f2.frame_number)
             from game_frames f2
             where f2.game_id = game_frames.game_id
               and f2.frame_number < game_frames.frame_number
               and not f2.is_strike),
            0
          )
        else 0 end as strike_streak,
        -- Spare streak: count consecutive spare conversions (skip strikes)
        case when spare_converted then
          row_number() over (
            partition by game_id,
              (select count(*)
               from game_frames f3
               where f3.game_id = game_frames.game_id
                 and f3.frame_number <= game_frames.frame_number
                 and not f3.is_strike
                 and not f3.spare_converted)
            order by frame_number
          )
        else 0 end as spare_streak,
        -- Split detection
        (pins_remaining is not null
         and jsonb_array_length(pins_remaining) >= 2
         and is_split(pins_remaining)) as is_split_leave,
        -- 7-10 split
        (pins_remaining is not null
         and jsonb_array_length(pins_remaining) = 2
         and pins_remaining @> '[7]'::jsonb
         and pins_remaining @> '[10]'::jsonb) as is_710
      from game_frames
    ) frame_analysis
    group by game_id
  ),
  global_streaks as (
    select
      coalesce(max(max_strike_streak), 0)::int as max_consecutive_strikes,
      coalesce(max(max_spare_streak), 0)::int as max_consecutive_spares,
      coalesce(max(split_count), 0)::int as max_splits_in_game,
      coalesce(max(count_710), 0)::int as max_710_in_game,
      bool_or(has_split_spare) as has_split_spare
    from per_game_stats
  )
  select jsonb_build_object(
    'highGame', a.high_game,
    'totalGames', a.total_games,
    'totalSessions', a.total_sessions,
    'cleanGames', a.clean_games,
    'maxConsecutiveStrikes', g.max_consecutive_strikes,
    'maxConsecutiveSpares', g.max_consecutive_spares,
    'has200Game', coalesce(a.has_200_game, false),
    'has250Game', coalesce(a.has_250_game, false),
    'has149Game', coalesce(a.has_149_game, false),
    'totalStrikes', a.total_strikes,
    'totalSpares', a.total_spares,
    'gamesInSingleSession', coalesce(s.max_games_in_session, 0),
    'maxSplitsInGame', g.max_splits_in_game,
    'max710InGame', g.max_710_in_game,
    'hasSplitSpare', coalesce(g.has_split_spare, false)
  ) into result
  from agg_stats a
  cross join session_game_counts s
  cross join global_streaks g;

  return coalesce(result, '{}'::jsonb);
end;
$$;
