-- Composite indexes for common query patterns (user + date ordering)
create index if not exists idx_games_user_created on public.games(user_id, created_at desc);
create index if not exists idx_sessions_user_created on public.sessions(user_id, created_at desc);
