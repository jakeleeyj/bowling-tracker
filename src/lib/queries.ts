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
