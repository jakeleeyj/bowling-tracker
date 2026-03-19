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
        Relationships: [];
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
          idempotency_key: string | null;
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
          idempotency_key?: string | null;
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
          idempotency_key?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "games_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "games_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
          pins_remaining_roll2: number[] | null;
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
          pins_remaining_roll2?: number[] | null;
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
          pins_remaining_roll2?: number[] | null;
          spare_converted?: boolean;
          frame_score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "frames_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          subscription: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          subscription: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          subscription?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_player_overview_stats: {
        Args: {
          p_user_id: string;
          p_filter?: string;
          p_date_from?: string | null;
          p_date_to?: string | null;
        };
        Returns: Json;
      };
      get_player_leave_stats: {
        Args: {
          p_user_id: string;
          p_filter?: string;
          p_date_from?: string | null;
          p_date_to?: string | null;
        };
        Returns: Json;
      };
      get_player_lp: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      get_player_achievement_stats: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      is_split: {
        Args: {
          pins: Json;
        };
        Returns: boolean;
      };
      get_all_rankings: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_session_lp_deltas: {
        Args: {
          p_session_ids: string[];
        };
        Returns: Json;
      };
      end_season: {
        Args: {
          p_season_number: number;
          p_season_name: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}

// Helper types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Game = Database["public"]["Tables"]["games"]["Row"];
export type Frame = Database["public"]["Tables"]["frames"]["Row"];

export type PushSubscription =
  Database["public"]["Tables"]["push_subscriptions"]["Row"];

export type SessionWithGames = Session & {
  games: Game[];
  profiles: Profile;
};
