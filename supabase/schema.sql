-- Bowling Score Tracker Database Schema
-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Sessions (a bowling outing with multiple games)
create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_date date not null default current_date,
  venue text,
  event_label text,
  game_count int not null default 0,
  total_pins int not null default 0,
  created_at timestamptz default now() not null
);

-- Games (individual games within a session)
create table if not exists public.games (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_number int not null,
  total_score int not null default 0,
  entry_type text not null check (entry_type in ('quick', 'detailed')) default 'quick',
  is_clean boolean not null default false,
  strike_count int not null default 0,
  spare_count int not null default 0,
  created_at timestamptz default now() not null
);

-- Frames (frame-by-frame data for detailed games)
create table if not exists public.frames (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  frame_number int not null check (frame_number between 1 and 10),
  roll_1 int not null,
  roll_2 int,
  roll_3 int,
  is_strike boolean not null default false,
  is_spare boolean not null default false,
  pins_remaining jsonb,
  spare_converted boolean not null default false,
  frame_score int not null default 0,
  unique(game_id, frame_number)
);

-- Indexes
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_date on public.sessions(session_date desc);
create index if not exists idx_games_session_id on public.games(session_id);
create index if not exists idx_games_user_id on public.games(user_id);
create index if not exists idx_frames_game_id on public.frames(game_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.games enable row level security;
alter table public.frames enable row level security;

-- Everyone can read all data
create policy "Anyone can view profiles" on public.profiles for select using (true);
create policy "Anyone can view sessions" on public.sessions for select using (true);
create policy "Anyone can view games" on public.games for select using (true);
create policy "Anyone can view frames" on public.frames for select using (true);

-- Users can only insert/update their own data
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on public.sessions for delete using (auth.uid() = user_id);

create policy "Users can insert own games" on public.games for insert with check (auth.uid() = user_id);
create policy "Users can update own games" on public.games for update using (auth.uid() = user_id);
create policy "Users can delete own games" on public.games for delete using (auth.uid() = user_id);

create policy "Users can manage own frames" on public.frames
  for all using (
    exists (
      select 1 from public.games where games.id = frames.game_id and games.user_id = auth.uid()
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
