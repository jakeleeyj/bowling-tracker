# Backlog

## Completed (2026-03-17)

- [x] **Share card design polish** — Total/Average alignment, consistent frame widths `#share` _(2026-03-16)_
- [x] **Share card 6+ games** — compact mode overflow fix `#share` _(2026-03-16)_
- [x] **Duplicate session on partial save** — idempotency key on sessions table `#reliability` _(2026-03-17)_
- [x] **database.types.ts** — regenerated with all tables, Relationships, function signatures `#tech-debt` _(2026-03-17)_
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
- [x] **Leaderboard uses get_all_rankings** — single RPC instead of fetching all games for all users `#performance` _(2026-03-17)_
- [x] **Dashboard uses RPC functions** — get*player_lp + get_all_rankings + get_session_lp_deltas `#performance` *(2026-03-17)\_
- [x] **SessionCard lazy stats** — leave breakdown only computed when stats panel is opened `#performance` _(2026-03-17)_
- [x] **Offline logging** — queue saves when offline, auto-sync on reconnect, multiple session queue support `#reliability` _(2026-03-17)_
- [x] **Service worker caching** — app shell + /log page cached for offline access `#reliability` _(2026-03-17)_
- [x] **Profile empty state for filters** — "No sessions in this range" for YTD/custom filters `#ux` _(2026-03-17)_

## Completed (2026-03-18)

- [x] **Split detection overhaul** — Graph-based adjacency algorithm replacing 19 hardcoded patterns (190 valid splits), sleeper pairs (2-8, 3-9) treated as connected `#bugfix` _(2026-03-18)_
- [x] **Game tab management** — Add/remove game tabs with - button, cap at 8 games, disabled when last game has score `#ux` _(2026-03-18)_
- [x] **LP calibration rework** — No event weights during calibration (pure skill), linear recency decay replacing hard cutoffs `#ranking` _(2026-03-18)_
- [x] **Scorecard UI fixes** — Fixed column widths, tighter roll spacing, centered strike, always-visible undo button `#ui` _(2026-03-18)_
- [x] **Calibrated label on session cards** — Show "Calibrated" instead of misleading +2000 LP delta `#ux` _(2026-03-18)_
- [x] **Edit mode ongoing fix** — Clear stale localStorage when entering edit mode to prevent false "Ongoing" nav state `#bugfix` _(2026-03-18)_
- [x] **Leaderboard avg score** — Show average score in ranked player list `#ui` _(2026-03-18)_
- [x] **Migration file format** — Renamed all migrations to Supabase-compatible full timestamp format `#tech-debt` _(2026-03-18)_

## Medium Priority

- [ ] **Head-to-head comparison** — pick two players, compare stats side by side `#feature` _(2026-03-16)_
- [ ] **Export game history** — CSV/PDF download `#feature` _(2026-03-16)_
- [ ] **Auto-save: persist undo history** — undo stack lost on app close/resume `#autosave` _(2026-03-15)_
- [ ] **Capacitor wrapper** — wrap PWA for App Store / Play Store, unlocks haptics `#platform` _(2026-03-16)_
- [ ] **League/group management** — create groups, track team stats `#feature` _(2026-03-16)_
- [x] **Seasonal rank resets** — replaced with linear recency decay, no hard resets needed `#ranking` _(2026-03-16)_
- [ ] **Migrate profile/achievements to Postgres functions** — reduce client-side computation `#performance` _(2026-03-17)_

## Epic: Seasons

- [ ] **Seasonal rank system** — Define season duration (monthly/quarterly), reset LP with soft placement based on previous rank `#ranking` `#seasons` _(2026-03-18)_
- [ ] **Season badge/medal on profile** — Display past season rank badges (e.g. "Season 1: Diamond") on player profile `#ranking` `#seasons` _(2026-03-18)_
- [ ] **Season history page** — View rank progression across all past seasons `#ranking` `#seasons` _(2026-03-18)_
- [ ] **LP ceiling tuning** — Make Challenger harder to reach (200 avg currently hits it at ~180 games), review decay curve and multipliers `#ranking` `#seasons` _(2026-03-18)_

## Low Priority

- [ ] **Share to specific game** — share a single game scorecard instead of full session `#share` _(2026-03-16)_
- [ ] **Haptic feedback on iOS** — requires Capacitor for native haptics `#platform` _(2026-03-16)_
- [ ] **Session notes/photos** — attach notes or photos to sessions `#feature` _(2026-03-16)_
- [ ] **Duplicate last session setup** — "bowl again" with same venue/game count `#qol` _(2026-03-16)_
