export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          session_date: string;
          venue: string | null;
          event_label: string | null;
          game_count: number;
          total_pins: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_date: string;
          venue?: string | null;
          event_label?: string | null;
          game_count: number;
          total_pins: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_date?: string;
          venue?: string | null;
          event_label?: string | null;
          game_count?: number;
          total_pins?: number;
          created_at?: string;
        };
      };
      games: {
        Row: {
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
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          game_number: number;
          total_score: number;
          entry_type: "quick" | "detailed";
          is_clean?: boolean;
          strike_count?: number;
          spare_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          game_number?: number;
          total_score?: number;
          entry_type?: "quick" | "detailed";
          is_clean?: boolean;
          strike_count?: number;
          spare_count?: number;
          created_at?: string;
        };
      };
      frames: {
        Row: {
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
        };
        Insert: {
          id?: string;
          game_id: string;
          frame_number: number;
          roll_1: number;
          roll_2?: number | null;
          roll_3?: number | null;
          is_strike?: boolean;
          is_spare?: boolean;
          pins_remaining?: number[] | null;
          spare_converted?: boolean;
          frame_score?: number;
        };
        Update: {
          id?: string;
          game_id?: string;
          frame_number?: number;
          roll_1?: number;
          roll_2?: number | null;
          roll_3?: number | null;
          is_strike?: boolean;
          is_spare?: boolean;
          pins_remaining?: number[] | null;
          spare_converted?: boolean;
          frame_score?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Helper types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Game = Database["public"]["Tables"]["games"]["Row"];
export type Frame = Database["public"]["Tables"]["frames"]["Row"];

export type SessionWithGames = Session & {
  games: Game[];
  profiles: Profile;
};
