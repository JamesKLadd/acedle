// Types for the Postgres schema in supabase/migrations. Hand-written in the
// shape `supabase gen types` produces, with the jsonb columns typed as the
// records the app stores in them. Keep in sync with the migrations.

import type { PlayerSeason } from "../data/types";
import type { EarnedBadge } from "../scoring/types";
import type { Entrant } from "../tournament";

export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: number;
          name: string;
          country: string;
          hand: PlayerSeason["hand"];
          height_cm: number | null;
        };
        Insert: {
          id: number;
          name: string;
          country: string;
          hand: PlayerSeason["hand"];
          height_cm?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      player_seasons: {
        Row: {
          year: number;
          player_id: number;
          final_rank: number;
          stats: PlayerSeason;
          /** YYYY-MM-DD */
          data_as_of: string;
        };
        Insert: Database["public"]["Tables"]["player_seasons"]["Row"];
        Update: Partial<Database["public"]["Tables"]["player_seasons"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "player_seasons_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          user_id: string;
          handle: string;
          avatar_url: string | null;
          created_at: string;
          /** Sum of the account's roll scores (kept up to date by a trigger). */
          total_score: number;
          roll_count: number;
        };
        Insert: {
          user_id: string;
          handle: string;
          avatar_url?: string | null;
          created_at?: string;
          total_score?: number;
          roll_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      rolls: {
        Row: {
          id: string;
          user_id: string;
          /** UTC day, YYYY-MM-DD. */
          day: string;
          /** Monday of the roll's UTC week, YYYY-MM-DD (generated). */
          week: string;
          year: number;
          player_id: number;
          season_snapshot: PlayerSeason;
          badges: EarnedBadge[];
          base: number;
          mult: number;
          score: number;
          scoring_version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day: string;
          year: number;
          player_id: number;
          season_snapshot: PlayerSeason;
          badges: EarnedBadge[];
          base: number;
          mult: number;
          score: number;
          scoring_version: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rolls"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "rolls_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      tournaments: {
        Row: {
          roll_id: string;
          /** 16 entrants in draw order (src/lib/tournament.ts). */
          entrants: Entrant[];
          you: number;
          seed: number;
          sets: boolean[];
          /** Set once the run is over: 0 = out in the round of 16 … 4 = champion. */
          rounds_won: number | null;
          created_at: string;
          finished_at: string | null;
        };
        Insert: {
          roll_id: string;
          entrants: Entrant[];
          you: number;
          seed: number;
          sets?: boolean[];
          rounds_won?: number | null;
          created_at?: string;
          finished_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tournaments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tournaments_roll_id_fkey";
            columns: ["roll_id"];
            isOneToOne: true;
            referencedRelation: "rolls";
            referencedColumns: ["id"];
          },
        ];
      };
      photo_submissions: {
        Row: {
          id: string;
          player_id: number;
          /** Null = any of the player's seasons. */
          year: number | null;
          file: string;
          thumb: string;
          width: number;
          height: number;
          author: string;
          license: string;
          license_url: string | null;
          photo_year: number | null;
          note: string | null;
          submitted_by: string | null;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          player_id: number;
          year?: number | null;
          file: string;
          thumb: string;
          width: number;
          height: number;
          author: string;
          license: string;
          license_url?: string | null;
          photo_year?: number | null;
          note?: string | null;
          submitted_by?: string | null;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["photo_submissions"]["Insert"]>;
        Relationships: [];
      };
      admins: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [];
      };
    };
    Views: {
      user_badges: {
        Row: {
          user_id: string;
          badge_id: string;
          times_earned: number;
          first_day: string;
          last_day: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_profile_and_claim: {
        Args: { p_user_id: string; p_handle: string; p_avatar_url: string | null; p_guest_id?: string | null };
        Returns: boolean;
      };
      tournament_add_set: {
        Args: { p_roll_id: string; p_expected: number; p_won: boolean; p_rounds_won?: number | null };
        Returns: boolean;
      };
      roll_leaderboard: {
        /** UTC days, YYYY-MM-DD, at most 7 days apart. */
        Args: { p_from: string; p_to: string };
        Returns: {
          rank: number;
          entries: number;
          day: string;
          handle: string;
          avatar_url: string | null;
          year: number;
          player_id: number;
          player_name: string;
          final_rank: number;
          score: number;
          is_viewer: boolean;
        }[];
      };
      alltime_leaderboard: {
        Args: never;
        Returns: {
          rank: number;
          entries: number;
          handle: string;
          avatar_url: string | null;
          total_score: number;
          roll_count: number;
          is_viewer: boolean;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type FunctionReturns<F extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][F]["Returns"];
