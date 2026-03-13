# Bowl Tracker

A mobile-first bowling score tracker for you and your friends. Track scores frame-by-frame, monitor spare conversions, see which pins you leave most often, and compete on a shared leaderboard.

## Features

- **Frame-by-frame scoring** — interactive pin diagram, real-time scorecard, and max possible score
- **Quick entry mode** — just log the total when you don't need full detail
- **Session tracking** — group games by outing with venue and event labels (League, Practice, Tournament, Casual)
- **Stats dashboard** — score trends, strike %, spare %, pin leave heatmap, spare streaks
- **Shared leaderboard** — everyone ranked by average score
- **Achievements** — unlock badges like 200 Club, Turkey, Clean Game, Six Pack, Perfect Game
- **Game history** — browse past sessions with tappable per-game breakdowns

## Tech Stack

- **Next.js 16** — App Router, TypeScript strict mode
- **Supabase** — Postgres, Auth (email/password), Row Level Security
- **Tailwind CSS** — dark glassmorphism theme
- **Lucide React** — SVG icons
- **Vercel** — hosting with auto-deploy

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/jakeleeyj/bowling-tracker.git
cd bowling-tracker
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the contents of `supabase/schema.sql`
3. Grab your project URL and anon key from **Settings > API**

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL and anon key.

### 4. Run locally

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) — works best on mobile or a narrow browser window.

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables
4. Deploy — every push to `main` auto-deploys

## Project Structure

```
src/
  app/
    (app)/          # Authenticated pages (dashboard, log, stats, history, etc.)
    (auth)/         # Login and signup
  components/       # BottomNav, FrameScorecard, PinDiagram
  lib/
    bowling.ts      # Score calculation engine
    queries.ts      # TypeScript types for Supabase queries
    supabase-*.ts   # Supabase client helpers (browser + server)
supabase/
  schema.sql        # Full database schema with RLS policies
```
