create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null check (category in ('bug', 'suggestion')),
  message text not null check (char_length(message) between 3 and 2000),
  page text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'seen', 'done')),
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy "Users can submit feedback" on feedback
  for insert with check (auth.uid() = user_id);

create policy "Users can view own feedback" on feedback
  for select using (auth.uid() = user_id);
