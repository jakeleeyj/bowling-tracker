-- Tighten push_subscriptions SELECT: users can only read their own rows
-- Server routes use service role key which bypasses RLS
drop policy "Authenticated users can read all subscriptions" on push_subscriptions;

create policy "Users can read own subscriptions"
  on push_subscriptions for select using (auth.uid() = user_id);
