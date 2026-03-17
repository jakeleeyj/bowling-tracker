# Backlog

## Completed (2026-03-17)

- [x] **Share card design polish** — Total/Average alignment, consistent frame widths `#share` _(2026-03-16)_
- [x] **Share card 6+ games** — compact mode overflow fix `#share` _(2026-03-16)_
- [x] **Duplicate session on partial save** — idempotency key on sessions table `#reliability` _(2026-03-17)_
- [x] **database.types.ts** — regenerated with pins*remaining_roll2, idempotency_key, push_subscriptions, Relationships, function signatures `#tech-debt` *(2026-03-17)\_
- [x] **Remove all `as any` casts** — 34 instances across 7 files, now fully typed `#tech-debt` _(2026-03-17)_
- [x] **Security fixes** — push subscribe scoped to user*id, push send input validation + service role, avatar MIME-based extension, RLS tightened `#security` *(2026-03-17)\_
- [x] **Composite DB indexes** — `games(user_id, created_at)` and `sessions(user_id, created_at)` `#performance` _(2026-03-17)_
- [x] **Leaderboard query scoped** — select only needed columns instead of `*` `#performance` _(2026-03-17)_
- [x] **Dynamic import html-to-image** — ~50KB removed from page bundles `#performance` _(2026-03-17)_
- [x] **BottomNav polling replaced** — custom event instead of 1s setInterval `#performance` _(2026-03-17)_
- [x] **Stats useMemo** — all derived stats wrapped in useMemo `#performance` _(2026-03-17)_
- [x] **Profile parallel fetches** — 3 queries in Promise.all instead of sequential `#performance` _(2026-03-17)_
- [x] **Shared RankEmblem component** — replaced duplicates in leaderboard + SessionResults `#tech-debt` _(2026-03-17)_
- [x] **Avatar uses next/image** — lazy loading + WebP optimization `#performance` _(2026-03-17)_
- [x] **loading.tsx for profile + stats** — streaming instead of blank screen `#performance` _(2026-03-17)_
- [x] **Postgres stats functions** — `get_player_overview_stats`, `get_player_leave_stats`, `get_player_lp`, `is_split` `#performance` _(2026-03-17)_
- [x] **Stats page server component** — RPC calls instead of downloading all games/frames, Suspense streaming `#performance` _(2026-03-17)_
- [x] **Proxy uses getSession** — cookie-based auth check instead of network call on every request `#performance` _(2026-03-17)_

## High Priority

- [ ] **Migrate leaderboard to `get_player_lp`** — currently fetches ALL games for ALL users to compute LP in JS `#performance` _(2026-03-17)_
- [ ] **Migrate dashboard to `get_player_lp`** — same unbounded game fetch + O(sessions x games) LP delta calc `#performance` _(2026-03-17)_
- [ ] **SessionCard: lazy compute stats** — skip frame analysis until stats panel is opened `#performance` _(2026-03-17)_

## Medium Priority

- [ ] **Head-to-head comparison** — pick two players, compare stats side by side `#feature` _(2026-03-16)_
- [ ] **Export game history** — CSV/PDF download `#feature` _(2026-03-16)_
- [ ] **Auto-save: persist undo history** — undo stack lost on app close/resume `#autosave` _(2026-03-15)_
- [ ] **Capacitor wrapper** — wrap PWA for App Store / Play Store `#platform` _(2026-03-16)_
- [ ] **League/group management** — create groups, track team stats `#feature` _(2026-03-16)_
- [ ] **Seasonal rank resets** — LP decay or reset per season `#ranking` _(2026-03-16)_
- [ ] **Migrate profile/achievements to Postgres functions** — reduce client-side computation `#performance` _(2026-03-17)_

## Low Priority

- [ ] **Share to specific game** — share a single game scorecard instead of full session `#share` _(2026-03-16)_
- [ ] **Haptic feedback on iOS** — navigator.vibrate not supported, need Capacitor for native haptics `#platform` _(2026-03-16)_
- [ ] **Offline logging** — queue saves when offline, sync when back online `#reliability` _(2026-03-16)_
- [ ] **Session notes/photos** — attach notes or photos to sessions `#feature` _(2026-03-16)_
- [ ] **Duplicate last session setup** — "bowl again" with same venue/game count `#qol` _(2026-03-16)_
