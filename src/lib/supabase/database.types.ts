// Types for the Postgres schema in supabase/migrations. Hand-written in the
// shape `supabase gen types` produces, with the jsonb columns typed as the
// records the app stores in them. Keep in sync with the migrations.

import type { PlayerSeason } from "../data/types";
import type { EarnedBadge } from "../scoring/types";

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
        };
        Insert: {
          user_id: string;
          handle: string;
          avatar_url?: string | null;
          created_at?: string;
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
