-- Cache tables for rankings and session LP deltas
-- Eliminates expensive per-request LP recalculation

-- 1. Rankings cache: one row per user with pre-computed LP, rank, stats
create table if not exists player_rankings_cache (
  user_id uuid primary key references profiles(id) on delete cascade,
  lp int not null default 0,
  total_games int not null default 0,
  avg int not null default 0,
  high int not null default 0,
  rank text not null default 'Iron',
  division text,
  trend text not null default 'stable',
  progress int not null default 0,
  updated_at timestamptz not null default now()
);

-- 2. Session LP delta cache: one row per session
create table if not exists session_lp_cache (
  session_id uuid primary key references sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  lp_delta int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_lp_cache_user on session_lp_cache(user_id);

-- Enable RLS
alter table player_rankings_cache enable row level security;
alter table session_lp_cache enable row level security;

-- Everyone can read rankings (leaderboard is public)
create policy "Rankings readable by all authenticated users"
  on player_rankings_cache for select
  to authenticated using (true);

-- Session LP cache readable by all (LP deltas are shown in the public activity feed)
create policy "Session LP cache readable by all authenticated users"
  on session_lp_cache for select
  to authenticated using (true);

-- 3. Function to recalculate rankings for a single user
create or replace function refresh_player_ranking(p_user_id uuid)
returns void
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
        (v_scores[i] - 180) *
        case when (v_total - i) < 4 then 1.0 else v_weights[i] end *
        case when (v_total - i) < 4 then 5 else 1 end *
        greatest(0.25, 1.0 - (i - 1) * 0.0125)
      );
    end loop;
    v_lp := greatest(v_lp, 0);

    -- Trend
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

  -- Determine rank/division
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

  -- Upsert
  insert into player_rankings_cache (user_id, lp, total_games, avg, high, rank, division, trend, progress, updated_at)
  values (p_user_id, round(v_lp)::int, v_total, v_avg, v_high, v_rank, v_division, v_trend, v_progress, now())
  on conflict (user_id) do update set
    lp = excluded.lp,
    total_games = excluded.total_games,
    avg = excluded.avg,
    high = excluded.high,
    rank = excluded.rank,
    division = excluded.division,
    trend = excluded.trend,
    progress = excluded.progress,
    updated_at = excluded.updated_at;
end;
$$;

-- 4. Function to recalculate session LP deltas for a single user
create or replace function refresh_session_lp_deltas(p_user_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_scores int[];
  v_weights numeric[];
  v_full_lp numeric;
  v_total int;
  v_session record;
  v_session_game_ids uuid[];
  v_scores_without int[];
  v_weights_without numeric[];
  v_without_lp numeric;
  i int;
begin
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
  where g.user_id = p_user_id;

  v_total := coalesce(array_length(v_scores, 1), 0);

  -- Delete existing cache for this user
  delete from session_lp_cache where user_id = p_user_id;

  if v_total < 4 then return; end if;

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

  -- Calculate delta for each session
  for v_session in
    select distinct s.id as session_id
    from sessions s
    join games g on g.session_id = s.id
    where s.user_id = p_user_id
  loop
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
    where g.user_id = p_user_id
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

    insert into session_lp_cache (session_id, user_id, lp_delta, updated_at)
    values (v_session.session_id, p_user_id, round(v_full_lp - v_without_lp)::int, now());
  end loop;
end;
$$;

-- 5. Trigger: on game insert/update/delete, refresh that user's rankings + LP deltas
create or replace function trigger_refresh_player_cache()
returns trigger
language plpgsql security definer as $$
declare
  v_user_id uuid;
begin
  v_user_id := coalesce(new.user_id, old.user_id);
  perform refresh_player_ranking(v_user_id);
  perform refresh_session_lp_deltas(v_user_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_player_cache on games;
create trigger trg_refresh_player_cache
  after insert or update or delete on games
  for each row execute function trigger_refresh_player_cache();

-- 6. Replace get_all_rankings to read from cache
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
      'progress', r.progress
    ) order by r.lp desc), '[]'::jsonb)
    from player_rankings_cache r
  );
end;
$fn$;

-- 7. Replace get_session_lp_deltas to read from cache
create or replace function get_session_lp_deltas(p_session_ids uuid[])
returns jsonb
language plpgsql stable security invoker as $fn$
declare
  result jsonb := '{}'::jsonb;
  v_row record;
begin
  for v_row in
    select session_id, lp_delta
    from session_lp_cache
    where session_id = any(p_session_ids)
  loop
    result := result || jsonb_build_object(v_row.session_id::text, v_row.lp_delta);
  end loop;
  return result;
end;
$fn$;

-- 8. Seed the cache for all existing users
do $$
declare
  v_user record;
begin
  for v_user in select id from profiles loop
    perform refresh_player_ranking(v_user.id);
    perform refresh_session_lp_deltas(v_user.id);
  end loop;
end;
$$;
