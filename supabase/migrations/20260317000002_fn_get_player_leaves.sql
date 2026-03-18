create or replace function get_player_leave_stats(
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
    select g.id, g.created_at
    from games g
    join sessions s on s.id = g.session_id
    where g.user_id = p_user_id
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
$$;
