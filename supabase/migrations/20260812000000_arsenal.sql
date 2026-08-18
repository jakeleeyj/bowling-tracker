-- Arsenal: bowling balls with layout + drilling specs, and flight analyses
create table if not exists balls (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  brand text,
  weight_lbs int check (weight_lbs between 6 and 16),
  -- ball specs
  rg numeric(4,3) check (rg between 2.46 and 2.80),
  differential numeric(4,3) check (differential between 0 and 0.060),
  coverstock text check (coverstock in ('solid', 'pearl', 'hybrid', 'urethane', 'plastic')),
  core_type text check (core_type in ('symmetric', 'asymmetric')),
  -- chosen layout
  drilling_angle int check (drilling_angle between 10 and 90),
  pin_to_pap numeric(3,2) check (pin_to_pap between 0.75 and 6),
  val_angle int check (val_angle between 20 and 90),
  pin_buffer numeric(3,2),
  psa_to_pap numeric(3,2),
  -- drilling specs (all optional, filled by pro shop)
  pap_over numeric(3,2),
  pap_up numeric(3,2),
  span numeric(4,3),
  thumb_pitch_forward numeric(3,2),
  thumb_pitch_lateral numeric(3,2),
  finger_pitch_forward numeric(3,2),
  finger_pitch_lateral numeric(3,2),
  thumb_size text,
  finger_size text,
  no_thumb boolean default false not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists flight_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  ball_speed_mph numeric(3,1) not null,
  rev_rate int not null,
  axis_tilt int not null,
  axis_rotation int not null,
  lane_condition text not null check (lane_condition in ('dry', 'medium', 'oily')),
  speed_rev_match text not null,
  style text not null,
  drilling_angle int not null,
  pin_to_pap numeric(3,2) not null,
  val_angle int not null,
  created_at timestamptz default now() not null
);

-- RLS: owner-scoped (arsenal is private, unlike sessions/games)
alter table balls enable row level security;
alter table flight_analyses enable row level security;

create policy "Users can read own balls"
  on balls for select using (auth.uid() = user_id);
create policy "Users can insert own balls"
  on balls for insert with check (auth.uid() = user_id);
create policy "Users can update own balls"
  on balls for update using (auth.uid() = user_id);
create policy "Users can delete own balls"
  on balls for delete using (auth.uid() = user_id);

create policy "Users can read own analyses"
  on flight_analyses for select using (auth.uid() = user_id);
create policy "Users can insert own analyses"
  on flight_analyses for insert with check (auth.uid() = user_id);
create policy "Users can delete own analyses"
  on flight_analyses for delete using (auth.uid() = user_id);

create index if not exists idx_balls_user_id on balls(user_id);
create index if not exists idx_flight_analyses_user_id on flight_analyses(user_id);
