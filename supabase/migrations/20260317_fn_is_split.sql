-- Helper: detect split leaves (mirrors src/lib/bowling.ts SPLIT_PATTERNS)
create or replace function is_split(pins jsonb) returns boolean
language sql immutable as $$
  with sorted as (
    select jsonb_agg(v order by v) as p
    from jsonb_array_elements(pins) as v
  )
  select
    jsonb_array_length(pins) >= 2
    and not pins @> '[1]'::jsonb
    and (select p from sorted) in (
      '[2, 7]', '[2, 10]', '[3, 7]', '[3, 10]',
      '[4, 6]', '[4, 9]', '[4, 10]',
      '[5, 7]', '[5, 10]', '[6, 7]', '[6, 8]', '[7, 10]',
      '[2, 4, 10]', '[2, 7, 10]', '[3, 6, 7]', '[3, 7, 10]',
      '[4, 7, 10]', '[6, 7, 10]',
      '[4, 6, 7, 10]', '[4, 6, 7, 9, 10]'
    );
$$;
