export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      award_categories: {
        Row: {
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      award_nominations: {
        Row: {
          created_at: string
          id: string
          nominated_by: string | null
          nominee_profile_id: string
          period_id: string
          reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          nominated_by?: string | null
          nominee_profile_id: string
          period_id: string
          reason?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          nominated_by?: string | null
          nominee_profile_id?: string
          period_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_nominations_nominated_by_fkey"
            columns: ["nominated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_nominations_nominee_profile_id_fkey"
            columns: ["nominee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_nominations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "award_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      award_periods: {
        Row: {
          category_id: string
          id: string
          nomination_closes_at: string | null
          nomination_opens_at: string | null
          period_end: string
          period_label: string
          period_start: string
          status: string
          voting_closes_at: string | null
          voting_opens_at: string | null
        }
        Insert: {
          category_id: string
          id?: string
          nomination_closes_at?: string | null
          nomination_opens_at?: string | null
          period_end: string
          period_label: string
          period_start: string
          status?: string
          voting_closes_at?: string | null
          voting_opens_at?: string | null
        }
        Update: {
          category_id?: string
          id?: string
          nomination_closes_at?: string | null
          nomination_opens_at?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          status?: string
          voting_closes_at?: string | null
          voting_opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "award_periods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      award_votes: {
        Row: {
          created_at: string
          id: string
          nomination_id: string
          period_id: string
          voter_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nomination_id: string
          period_id: string
          voter_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nomination_id?: string
          period_id?: string
          voter_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_votes_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "award_nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_votes_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "award_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_votes_voter_profile_id_fkey"
            columns: ["voter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      award_winners: {
        Row: {
          announced_at: string
          badge_id: string | null
          id: string
          nomination_id: string
          period_id: string
          vote_count: number
        }
        Insert: {
          announced_at?: string
          badge_id?: string | null
          id?: string
          nomination_id: string
          period_id: string
          vote_count: number
        }
        Update: {
          announced_at?: string
          badge_id?: string | null
          id?: string
          nomination_id?: string
          period_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "award_winners_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_winners_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "award_nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_winners_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: true
            referencedRelation: "award_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          criteria: Json | null
          description: string | null
          icon_asset_ref: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_asset_ref?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_asset_ref?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          created_at: string
          emblem_asset_ref: string | null
          external_ref: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emblem_asset_ref?: string | null
          external_ref?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emblem_asset_ref?: string | null
          external_ref?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_rooms: {
        Row: {
          conversation_id: string
          description: string | null
          is_regional: boolean
          name: string
          region: string | null
          slug: string
        }
        Insert: {
          conversation_id: string
          description?: string | null
          is_regional?: boolean
          name: string
          region?: string | null
          slug: string
        }
        Update: {
          conversation_id?: string
          description?: string | null
          is_regional?: boolean
          name?: string
          region?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_rooms_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          profile_id: string
          role: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          profile_id: string
          role?: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          club_id: string | null
          created_at: string
          created_by: string
          id: string
          kind: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_snapshots: {
        Row: {
          computed_at: string
          id: string
          period_end: string
          period_start: string
          profile_id: string
          score: number
        }
        Insert: {
          computed_at?: string
          id?: string
          period_end: string
          period_start: string
          profile_id: string
          score: number
        }
        Update: {
          computed_at?: string
          id?: string
          period_end?: string
          period_start?: string
          profile_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "engagement_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_levels: {
        Row: {
          level: number
          min_points: number
          title: string
        }
        Insert: {
          level: number
          min_points: number
          title: string
        }
        Update: {
          level?: number
          min_points?: number
          title?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          created_at: string
          detail: Json | null
          event_type: string
          id: string
          match_id: string
          minute: number | null
          player_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          event_type: string
          id?: string
          match_id: string
          minute?: number | null
          player_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json | null
          event_type?: string
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineups: {
        Row: {
          club_id: string
          created_at: string
          formation: string | null
          grid: string | null
          id: string
          is_starting: boolean
          match_id: string
          player_id: string | null
          player_name: string
          shirt_number: number | null
        }
        Insert: {
          club_id: string
          created_at?: string
          formation?: string | null
          grid?: string | null
          id?: string
          is_starting: boolean
          match_id: string
          player_id?: string | null
          player_name: string
          shirt_number?: number | null
        }
        Update: {
          club_id?: string
          created_at?: string
          formation?: string | null
          grid?: string | null
          id?: string
          is_starting?: boolean
          match_id?: string
          player_id?: string | null
          player_name?: string
          shirt_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          club_id: string
          competition: string | null
          created_at: string
          external_ref: string | null
          home_score: number | null
          id: string
          is_home: boolean
          kickoff_at: string
          opponent_external_ref: string | null
          opponent_name: string
          status: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          club_id: string
          competition?: string | null
          created_at?: string
          external_ref?: string | null
          home_score?: number | null
          id?: string
          is_home: boolean
          kickoff_at: string
          opponent_external_ref?: string | null
          opponent_name: string
          status?: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          club_id?: string
          competition?: string | null
          created_at?: string
          external_ref?: string | null
          home_score?: number | null
          id?: string
          is_home?: boolean
          kickoff_at?: string
          opponent_external_ref?: string | null
          opponent_name?: string
          status?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          mentioned_profile_id: string
          message_id: string | null
          post_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_profile_id: string
          message_id?: string | null
          post_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_profile_id?: string
          message_id?: string | null
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_profile_id_fkey"
            columns: ["mentioned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_media: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          media_type: string
          message_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          media_type: string
          message_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          media_type?: string
          message_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_media_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          parent_message_id: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          parent_message_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          parent_message_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: string
          created_at: string
          expires_at: string | null
          id: string
          moderator_id: string
          reason: string
          report_id: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          moderator_id: string
          reason: string
          report_id?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          moderator_id?: string
          reason?: string
          report_id?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          subject_id: string | null
          subject_type: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          subject_id?: string | null
          subject_type?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          subject_id?: string | null
          subject_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          club_id: string
          created_at: string
          external_ref: string | null
          full_name: string
          id: string
          photo_asset_ref: string | null
          position: string | null
          shirt_number: number | null
          squad_synced_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          external_ref?: string | null
          full_name: string
          id?: string
          photo_asset_ref?: string | null
          position?: string | null
          shirt_number?: number | null
          squad_synced_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          external_ref?: string | null
          full_name?: string
          id?: string
          photo_asset_ref?: string | null
          position?: string | null
          shirt_number?: number | null
          squad_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      point_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          metadata: Json | null
          points: number
          profile_id: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          points: number
          profile_id: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          points?: number
          profile_id?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          height: number | null
          id: string
          media_type: string
          order_index: number
          post_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          media_type: string
          order_index?: number
          post_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          media_type?: string
          order_index?: number
          post_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string | null
          category: string
          club_id: string
          created_at: string
          deleted_at: string | null
          id: string
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          body?: string | null
          category?: string
          club_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          category?: string
          club_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_scores: {
        Row: {
          breakdown: Json | null
          id: string
          points_awarded: number
          prediction_id: string
          scored_at: string
          scored_by: string
        }
        Insert: {
          breakdown?: Json | null
          id?: string
          points_awarded: number
          prediction_id: string
          scored_at?: string
          scored_by?: string
        }
        Update: {
          breakdown?: Json | null
          id?: string
          points_awarded?: number
          prediction_id?: string
          scored_at?: string
          scored_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_scores_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: true
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          id: string
          locked_at: string | null
          match_id: string
          predicted_away_score: number | null
          predicted_first_scorer_id: string | null
          predicted_home_score: number | null
          predicted_ht_away: number | null
          predicted_ht_home: number | null
          predicted_motm_id: string | null
          profile_id: string
          submitted_at: string
        }
        Insert: {
          id?: string
          locked_at?: string | null
          match_id: string
          predicted_away_score?: number | null
          predicted_first_scorer_id?: string | null
          predicted_home_score?: number | null
          predicted_ht_away?: number | null
          predicted_ht_home?: number | null
          predicted_motm_id?: string | null
          profile_id: string
          submitted_at?: string
        }
        Update: {
          id?: string
          locked_at?: string | null
          match_id?: string
          predicted_away_score?: number | null
          predicted_first_scorer_id?: string | null
          predicted_home_score?: number | null
          predicted_ht_away?: number | null
          predicted_ht_home?: number | null
          predicted_motm_id?: string | null
          profile_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_predicted_first_scorer_id_fkey"
            columns: ["predicted_first_scorer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_predicted_motm_id_fkey"
            columns: ["predicted_motm_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          cover_focus_y: number
          cover_url: string | null
          created_at: string
          display_name: string | null
          fan_level: number
          fan_points: number
          fan_since_year: number | null
          fan_style: string | null
          favourite_chant: string | null
          favourite_era: string | null
          favourite_memory: string | null
          favourite_player: string | null
          favourite_player_id: string | null
          favourite_shirt: string | null
          id: string
          location: string | null
          matchday_routine: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_focus_y?: number
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          fan_level?: number
          fan_points?: number
          fan_since_year?: number | null
          fan_style?: string | null
          favourite_chant?: string | null
          favourite_era?: string | null
          favourite_memory?: string | null
          favourite_player?: string | null
          favourite_player_id?: string | null
          favourite_shirt?: string | null
          id: string
          location?: string | null
          matchday_routine?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_focus_y?: number
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          fan_level?: number
          fan_points?: number
          fan_since_year?: number | null
          fan_style?: string | null
          favourite_chant?: string | null
          favourite_era?: string | null
          favourite_memory?: string | null
          favourite_player?: string | null
          favourite_player_id?: string | null
          favourite_shirt?: string | null
          id?: string
          location?: string | null
          matchday_routine?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_fan_level_fkey"
            columns: ["fan_level"]
            isOneToOne: false
            referencedRelation: "fan_levels"
            referencedColumns: ["level"]
          },
          {
            foreignKeyName: "profiles_favourite_player_id_fkey"
            columns: ["favourite_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      room_bans: {
        Row: {
          banned_by: string
          banned_until: string | null
          conversation_id: string
          created_at: string
          profile_id: string
          reason: string | null
        }
        Insert: {
          banned_by: string
          banned_until?: string | null
          conversation_id: string
          created_at?: string
          profile_id: string
          reason?: string | null
        }
        Update: {
          banned_by?: string
          banned_until?: string | null
          conversation_id?: string
          created_at?: string
          profile_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bans_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bans_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_poll_options: {
        Row: {
          id: string
          label: string
          order_index: number
          poll_id: string
        }
        Insert: {
          id?: string
          label: string
          order_index?: number
          poll_id: string
        }
        Update: {
          id?: string
          label?: string
          order_index?: number
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "room_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      room_poll_votes: {
        Row: {
          option_id: string
          poll_id: string
          profile_id: string
          voted_at: string
        }
        Insert: {
          option_id: string
          poll_id: string
          profile_id: string
          voted_at?: string
        }
        Update: {
          option_id?: string
          poll_id?: string
          profile_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "room_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "room_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_poll_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_polls: {
        Row: {
          closed_at: string | null
          closes_at: string | null
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          question: string
        }
        Insert: {
          closed_at?: string | null
          closes_at?: string | null
          conversation_id: string
          created_at?: string
          created_by: string
          id?: string
          question: string
        }
        Update: {
          closed_at?: string | null
          closes_at?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_polls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          active_from: string
          active_to: string | null
          club_id: string | null
          id: string
          points_value: number
          rule_key: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          club_id?: string | null
          id?: string
          points_value: number
          rule_key: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          club_id?: string | null
          id?: string
          points_value?: number
          rule_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          created_at: string
          handle_or_url: string
          id: string
          platform: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          handle_or_url: string
          id?: string
          platform: string
          profile_id: string
        }
        Update: {
          created_at?: string
          handle_or_url?: string
          id?: string
          platform?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          profile_id: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          profile_id: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          profile_id?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mutes: {
        Row: {
          created_at: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mutes_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mutes_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          profile_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          profile_id: string
          role_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_vote_counts: {
        Args: { p_period_id: string }
        Returns: {
          nomination_id: string
          votes: number
        }[]
      }
      determine_award_winner: {
        Args: { p_period_id: string }
        Returns: {
          nomination_id: string
          vote_count: number
        }[]
      }
      email_for_username: { Args: { lookup_username: string }; Returns: string }
      has_blocked_participant_in_conversation: {
        Args: { p_conversation_id: string; p_profile_id: string }
        Returns: boolean
      }
      has_mutual_block: {
        Args: { p_profile_a: string; p_profile_b: string }
        Returns: boolean
      }
      has_role: { Args: { role_key: string }; Returns: boolean }
      is_conversation_admin: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_conversation_creator: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      record_moderation_action: {
        Args: {
          p_action_type: string
          p_expires_at?: string
          p_reason: string
          p_report_id?: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      room_member_count: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      room_poll_results: {
        Args: { p_poll_id: string }
        Returns: {
          option_id: string
          votes: number
        }[]
      }
      settle_prediction: {
        Args: { p_prediction_id: string }
        Returns: {
          breakdown: Json | null
          id: string
          points_awarded: number
          prediction_id: string
          scored_at: string
          scored_by: string
        }
        SetofOptions: {
          from: "*"
          to: "prediction_scores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
