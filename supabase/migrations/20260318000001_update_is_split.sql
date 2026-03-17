-- Update is_split to use graph-based adjacency check instead of hardcoded patterns
-- Mirrors src/lib/bowling.ts PIN_ADJACENCY graph
create or replace function is_split(pins jsonb) returns boolean
language plpgsql immutable as $$
declare
  pin_arr int[];
  adj int[][];
  visited boolean[];
  queue int[];
  current int;
  neighbor int;
  n int;
  visit_count int;
  i int;
  j int;
begin
  -- Must have 2+ pins, headpin must be down
  if jsonb_array_length(pins) < 2 then return false; end if;
  if pins @> '[1]'::jsonb then return false; end if;

  -- Convert jsonb to int array
  select array_agg(v::int) into pin_arr from jsonb_array_elements_text(pins) as v;
  n := array_length(pin_arr, 1);

  -- Pin adjacency (including same-row neighbors and sleeper pairs 2-8, 3-9)
  -- Index 1-10, each entry is array of adjacent pins
  adj := array[
    array[2, 3, 0, 0, 0, 0],       -- pin 1
    array[1, 3, 4, 5, 8, 0],       -- pin 2 (sleeper: 8)
    array[1, 2, 5, 6, 9, 0],       -- pin 3 (sleeper: 9)
    array[2, 5, 7, 8, 0, 0],       -- pin 4
    array[2, 3, 4, 6, 8, 9],       -- pin 5
    array[3, 5, 9, 10, 0, 0],      -- pin 6
    array[4, 8, 0, 0, 0, 0],       -- pin 7
    array[2, 4, 5, 7, 9, 0],       -- pin 8 (sleeper: 2)
    array[3, 5, 6, 8, 10, 0],      -- pin 9 (sleeper: 3)
    array[6, 9, 0, 0, 0, 0]        -- pin 10
  ];

  -- BFS from first pin
  visited := array_fill(false, array[10]);
  queue := array[pin_arr[1]];
  visited[pin_arr[1]] := true;
  visit_count := 1;

  while array_length(queue, 1) > 0 loop
    current := queue[1];
    queue := queue[2:];

    -- Check all neighbors of current pin
    for j in 1..6 loop
      neighbor := adj[current][j];
      if neighbor = 0 then continue; end if;
      if visited[neighbor] then continue; end if;

      -- Check if neighbor is in our pin set
      for i in 1..n loop
        if pin_arr[i] = neighbor then
          visited[neighbor] := true;
          visit_count := visit_count + 1;
          queue := array_append(queue, neighbor);
          exit;
        end if;
      end loop;
    end loop;
  end loop;

  return visit_count < n;
end;
$$;
