-- Push notification subscriptions
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  endpoint text unique not null,
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- RLS
alter table push_subscriptions enable row level security;

-- Users can manage their own subscriptions
create policy "Users can insert own subscriptions"
  on push_subscriptions for insert with check (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on push_subscriptions for delete using (auth.uid() = user_id);

-- Server needs to read all subscriptions to send notifications
create policy "Authenticated users can read all subscriptions"
  on push_subscriptions for select using (auth.role() = 'authenticated');

-- Index for fast lookup by user
create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);
