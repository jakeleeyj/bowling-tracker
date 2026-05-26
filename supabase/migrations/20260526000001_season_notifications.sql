-- Track which season milestone push notifications have already been sent, so
-- the season-reminders cron is idempotent across multiple daily runs.
create table if not exists public.season_notifications (
  season_number int not null,
  milestone text not null check (milestone in ('30d', '7d', 'started')),
  sent_at timestamptz not null default now(),
  primary key (season_number, milestone)
);

alter table public.season_notifications enable row level security;
-- No client access needed — service role only (cron writes, no reads from app).
