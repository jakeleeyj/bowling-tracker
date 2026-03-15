# Spare Me?

A mobile-first bowling score tracker PWA. Track scores frame-by-frame, analyze spare conversions, compete on a ranked leaderboard, and get push notifications when friends bowl.

## Features

### Scoring

- **Frame-by-frame entry** — interactive pin diagram, tap pins left standing, real-time scorecard with max possible score
- **Quick entry mode** — just log the total score when you don't need frame detail
- **Frame 10 handling** — full 3-roll support with correct pin resets after strikes/spares
- **Auto-save** — session state persists to localStorage, resume where you left off if the app closes
- **Multi-game sessions** — log 1-6+ games per session, switch between games freely
- **Edit games** — tap any frame to re-enter, see before/after diff of changed frames

### Ranking System (LP)

- **League Points** — LP based on score relative to 180 baseline, weighted by event type
- **Calibration** — first 4 games earn 5x LP to set starting rank
- **Recency weighting** — last 30 games at full weight, older games gradually fade
- **10 rank tiers** — Iron through Challenger, with divisions (IV-I) per tier
- **Event weights** — Tournament (1.5x), Funbowl (1.35x), League (1.25x), Casual (1.0x)

### Stats & Analytics

- **Score trend chart** — rolling average over time
- **Strike/Spare/Double/Pocket rates** — with filter by last 10, 50, or YTD
- **Spare analysis** — single pin, multi-pin, and split conversion rates
- **Practice targets** — highlights your most missed leaves
- **Spare conversion trend** — track improvement over time

### Social

- **Shared leaderboard** — all players ranked by LP with trend indicators
- **Player profiles** — tap any player to see their stats, rank card, and recent sessions
- **Push notifications** — get notified when friends log sessions, hit PBs, or bowl a 149
- **Deploy notifications** — automatic push when the app is updated

### Achievements (19 badges)

- Score milestones: 200 Club, 250 Club, Perfect Game, 149 Club
- Streak badges: Turkey, Four-Bagger, Six Pack
- Skill badges: Clean Game, Mr. Clean, Split Decision, Strike Machine, Spare Collector
- Dedication: Regular, Dedicated, Century Club, Marathon

### UX

- **PWA** — installable on iOS and Android home screen
- **Venue combobox** — searchable dropdown with saved venues, defaults to last used
- **Pin diagrams** — roll-by-roll detail showing knocked vs standing pins, splits in red
- **Haptic feedback** — vibration on strikes, spares, and pin confirms (Android)
- **Infinite scroll** — session history loads 20 at a time
- **Ongoing session indicator** — spinning bowling ball icon in nav when session is active

## Tech Stack

- **Next.js 16** — App Router, TypeScript strict mode
- **Supabase** — Postgres, Auth (email/password), Row Level Security
- **Tailwind CSS** — dark glassmorphism theme
- **Lucide React** — SVG icons
- **web-push** — VAPID push notifications
- **Vercel** — hosting with auto-deploy
- **GitHub Actions** — deploy notifications on push

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/jakeleeyj/bowling-tracker.git
cd bowling-tracker
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run `supabase/schema.sql`
3. Run all migration files in `supabase/migrations/`
4. Grab your project URL, anon key, and service role key from **Settings > API**

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `DEPLOY_NOTIFY_SECRET`

### 4. Run locally

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) — works best on mobile or a narrow browser window.

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables listed above
4. Deploy — every push to `main` auto-deploys and sends push notifications

## Project Structure

```
src/
  app/
    (app)/              # Authenticated pages
      dashboard/        # Home — stats, rank card, recent activity
      log/              # Session logging (thin router)
      stats/            # Stats dashboard with overview + spares tabs
      leaderboard/      # Ranked leaderboard
      player/[id]/      # Other player's profile
      profile/          # Your profile, achievements, game history
      game/[id]/        # Individual game detail
    (auth)/             # Login and signup
    api/
      push/send/        # Send push to other users (auth required)
      push/subscribe/   # Manage push subscriptions
      push/deploy-notify/ # Deploy notification endpoint (secret auth)
  components/
    log/                # Session logging UI components
      GameEntry.tsx     # Frame entry, game tabs, pin diagram
      SessionSetup.tsx  # Venue, event, game count selection
      SessionReview.tsx # All-games-complete summary
      SessionResults.tsx # LP change, achievements, rank up animation
    BottomNav.tsx       # Navigation with ongoing session indicator
    SessionCard.tsx     # Expandable session with mini scorecards
    FrameScorecard.tsx  # 10-frame scorecard display
    PinDiagram.tsx      # Interactive pin selection
    VenueCombobox.tsx   # Searchable venue dropdown
    PlayerSessions.tsx  # Infinite scroll sessions for player profiles
  hooks/
    useSessionState.ts  # All bowling state + game logic
  lib/
    bowling.ts          # Score calculation engine
    ranking.ts          # LP calculation, rank tiers, recency weighting
    achievements.ts     # 19 achievement definitions + detection
    queries.ts          # TypeScript types for Supabase queries
    supabase-*.ts       # Supabase client helpers (browser + server)
supabase/
  schema.sql            # Full database schema with RLS policies
  migrations/           # Schema migrations
.github/
  workflows/
    deploy-notify.yml   # Push notification on deploy
```

## Roadmap

- [ ] Share scorecard as image
- [ ] Head-to-head player comparison
- [ ] Export game history (CSV/PDF)
- [ ] Capacitor wrapper for App Store / Play Store
- [ ] In-app purchase for premium features
- [ ] League/group management
- [ ] Seasonal rank resets
