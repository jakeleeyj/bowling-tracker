-- Add idempotency key to prevent duplicate sessions on partial save/retry
alter table public.sessions add column if not exists idempotency_key text;
create unique index if not exists idx_sessions_idempotency on public.sessions(idempotency_key) where idempotency_key is not null;
