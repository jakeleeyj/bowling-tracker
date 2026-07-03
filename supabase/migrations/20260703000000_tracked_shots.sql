create table if not exists public.tracked_shots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_id uuid references public.sessions(id) on delete set null,
  game_number int,
  frame_number int,
  speed_mph numeric(4,1) not null,
  release_board numeric(4,1) not null,
  arrows_board numeric(4,1) not null,
  breakpoint_board numeric(4,1) not null,
  entry_board numeric(4,1) not null,
  path jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_tracked_shots_user on public.tracked_shots(user_id, created_at desc);
create index if not exists idx_tracked_shots_session on public.tracked_shots(session_id);

alter table public.tracked_shots enable row level security;

create policy "tracked_shots_select_own" on public.tracked_shots
  for select using (auth.uid() = user_id);
create policy "tracked_shots_insert_own" on public.tracked_shots
  for insert with check (auth.uid() = user_id);
create policy "tracked_shots_delete_own" on public.tracked_shots
  for delete using (auth.uid() = user_id);
