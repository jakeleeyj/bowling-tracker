// Shared query result types for Supabase joins
// These match the shapes returned by common queries

export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface GameRow {
  id: string;
  session_id: string;
  user_id: string;
  game_number: number;
  total_score: number;
  entry_type: "quick" | "detailed";
  is_clean: boolean;
  strike_count: number;
  spare_count: number;
  created_at: string;
}

export interface FrameRow {
  id: string;
  game_id: string;
  frame_number: number;
  roll_1: number;
  roll_2: number | null;
  roll_3: number | null;
  is_strike: boolean;
  is_spare: boolean;
  pins_remaining: number[] | null;
  pins_remaining_roll2: number[] | null;
  spare_converted: boolean;
  frame_score: number;
}

export interface SessionRow {
  id: string;
  user_id: string;
  session_date: string;
  venue: string | null;
  event_label: string | null;
  game_count: number;
  total_pins: number;
  created_at: string;
}

export interface GameRowWithFrames extends GameRow {
  frames: FrameRow[];
}

export interface SessionWithGamesAndProfile extends SessionRow {
  profiles: ProfileRow;
  games: GameRow[];
}

export interface SessionWithGamesFramesAndProfile extends SessionRow {
  profiles: ProfileRow;
  games: GameRowWithFrames[];
}

export interface SessionWithGames extends SessionRow {
  games: GameRow[];
}

export interface GameWithSession extends GameRow {
  sessions: {
    session_date: string;
    venue: string | null;
    event_label: string | null;
  };
}

export interface GameWithSessionDate extends GameRow {
  sessions: { session_date: string };
}

// RPC return types for Postgres stats functions

export interface OverviewStats {
  total_games: number;
  avg: number;
  high: number;
  low: number;
  detailed_games: number;
  clean_games: number;
  clean_rate: number;
  strikes: number;
  total_frames_played: number;
  strike_rate: number;
  spare_opportunities: number;
  spares_converted: number;
  spare_rate: number;
  first_ball_frames: number;
  pocket_hits: number;
  pocket_rate: number;
  doubles: number;
  double_opportunities: number;
  double_rate: number;
  max_spare_streak: number;
  spare_conv_trend: number[];
  scores: number[];
}

export interface LeaveEntry {
  pins: number[];
  attempts: number;
  converted: number;
  rate: number;
  category?: string;
}

export interface LeaveStats {
  total_spare_opportunities: number;
  total_spares_converted: number;
  spare_rate: number;
  single_pin: { attempts: number; converted: number; rate: number };
  multi_pin: { attempts: number; converted: number; rate: number };
  splits: { attempts: number; converted: number; rate: number };
  single_pin_leaves: LeaveEntry[];
  multi_pin_leaves: LeaveEntry[];
  split_leaves: LeaveEntry[];
  practice_targets: LeaveEntry[];
}

export interface PlayerLP {
  lp: number;
  total_games: number;
  rank: string;
  division: string | null;
  avg: number;
  high: number;
}

export type StatsFilter = "last10" | "last50" | "ytd" | "custom" | "all";
