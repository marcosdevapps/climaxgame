export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      banned_terms: {
        Row: {
          term: string
        }
        Insert: {
          term: string
        }
        Update: {
          term?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey'
            columns: ['blocked_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey'
            columns: ['blocker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: number
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: number
          created_at?: string
          user_id?: string
        }
        Update: {
          comment_id?: number
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comment_likes_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comment_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          edited_at: string | null
          game_id: number
          id: number
          is_spoiler: boolean
          likes_count: number
          reports_count: number
          status: Database['public']['Enums']['comment_status']
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          edited_at?: string | null
          game_id: number
          id?: never
          is_spoiler?: boolean
          likes_count?: number
          reports_count?: number
          status?: Database['public']['Enums']['comment_status']
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          edited_at?: string | null
          game_id?: number
          id?: never
          is_spoiler?: boolean
          likes_count?: number
          reports_count?: number
          status?: Database['public']['Enums']['comment_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'trending_games'
            referencedColumns: ['game_id']
          },
          {
            foreignKeyName: 'comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      companies: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id: number
          name: string
          slug: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          game_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          game_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'trending_games'
            referencedColumns: ['game_id']
          },
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          status: Database['public']['Enums']['follow_status']
        }
        Insert: {
          created_at?: string
          follower_id?: string
          following_id: string
          status?: Database['public']['Enums']['follow_status']
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          status?: Database['public']['Enums']['follow_status']
        }
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey'
            columns: ['follower_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'follows_following_id_fkey'
            columns: ['following_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      game_companies: {
        Row: {
          company_id: number
          game_id: number
          role: Database['public']['Enums']['company_role']
        }
        Insert: {
          company_id: number
          game_id: number
          role: Database['public']['Enums']['company_role']
        }
        Update: {
          company_id?: number
          game_id?: number
          role?: Database['public']['Enums']['company_role']
        }
        Relationships: [
          {
            foreignKeyName: 'game_companies_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_companies_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_companies_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'trending_games'
            referencedColumns: ['game_id']
          },
        ]
      }
      game_genres: {
        Row: {
          game_id: number
          genre_id: number
        }
        Insert: {
          game_id: number
          genre_id: number
        }
        Update: {
          game_id?: number
          genre_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'game_genres_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_genres_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'trending_games'
            referencedColumns: ['game_id']
          },
          {
            foreignKeyName: 'game_genres_genre_id_fkey'
            columns: ['genre_id']
            isOneToOne: false
            referencedRelation: 'genres'
            referencedColumns: ['id']
          },
        ]
      }
      game_media: {
        Row: {
          external_id: string
          game_id: number
          id: number
          position: number
          type: Database['public']['Enums']['media_type']
        }
        Insert: {
          external_id: string
          game_id: number
          id?: never
          position?: number
          type: Database['public']['Enums']['media_type']
        }
        Update: {
          external_id?: string
          game_id?: number
          id?: never
          position?: number
          type?: Database['public']['Enums']['media_type']
        }
        Relationships: [
          {
            foreignKeyName: 'game_media_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_media_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'trending_games'
            referencedColumns: ['game_id']
          },
        ]
      }
      game_platforms: {
        Row: {
          game_id: number
          platform_id: number
        }
        Insert: {
          game_id: number
          platform_id: number
        }
        Update: {
          game_id?: number
          platform_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'game_platforms_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_platforms_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'trending_games'
            referencedColumns: ['game_id']
          },
          {
            foreignKeyName: 'game_platforms_platform_id_fkey'
            columns: ['platform_id']
            isOneToOne: false
            referencedRelation: 'platforms'
            referencedColumns: ['id']
          },
        ]
      }
      games: {
        Row: {
          age_rating: string | null
          background_image_id: string | null
          comments_count: number
          cover_image_id: string | null
          created_at: string
          critic_score: number | null
          favorites_count: number
          id: number
          igdb_id: number
          popularity: number
          release_date: string | null
          slug: string
          summary_en: string | null
          summary_es: string | null
          synced_at: string
          title: string
          title_normalized: string | null
          user_score_external: number | null
        }
        Insert: {
          age_rating?: string | null
          background_image_id?: string | null
          comments_count?: number
          cover_image_id?: string | null
          created_at?: string
          critic_score?: number | null
          favorites_count?: number
          id?: never
          igdb_id: number
          popularity?: number
          release_date?: string | null
          slug: string
          summary_en?: string | null
          summary_es?: string | null
          synced_at?: string
          title: string
          title_normalized?: string | null
          user_score_external?: number | null
        }
        Update: {
          age_rating?: string | null
          background_image_id?: string | null
          comments_count?: number
          cover_image_id?: string | null
          created_at?: string
          critic_score?: number | null
          favorites_count?: number
          id?: never
          igdb_id?: number
          popularity?: number
          release_date?: string | null
          slug?: string
          summary_en?: string | null
          summary_es?: string | null
          synced_at?: string
          title?: string
          title_normalized?: string | null
          user_score_external?: number | null
        }
        Relationships: []
      }
      genres: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id: number
          name: string
          slug: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action: Database['public']['Enums']['moderation_action_type']
          comment_id: number | null
          created_at: string
          id: number
          moderator_id: string | null
          reason: string | null
          suspended_until: string | null
          target_user_id: string | null
        }
        Insert: {
          action: Database['public']['Enums']['moderation_action_type']
          comment_id?: number | null
          created_at?: string
          id?: never
          moderator_id?: string | null
          reason?: string | null
          suspended_until?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: Database['public']['Enums']['moderation_action_type']
          comment_id?: number | null
          created_at?: string
          id?: never
          moderator_id?: string | null
          reason?: string | null
          suspended_until?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'moderation_actions_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'moderation_actions_moderator_id_fkey'
            columns: ['moderator_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'moderation_actions_target_user_id_fkey'
            columns: ['target_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          entity_id: number | null
          id: number
          read_at: string | null
          type: Database['public']['Enums']['notification_type']
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity_id?: number | null
          id?: never
          read_at?: string | null
          type: Database['public']['Enums']['notification_type']
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          entity_id?: number | null
          id?: never
          read_at?: string | null
          type?: Database['public']['Enums']['notification_type']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      platforms: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id: number
          name: string
          slug: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          comments_count: number
          created_at: string
          display_name: string | null
          favorites_count: number
          followers_count: number
          following_count: number
          id: string
          is_private: boolean
          onboarding_completed_at: string | null
          platforms: string[]
          role: Database['public']['Enums']['user_role']
          suspended_until: string | null
          updated_at: string
          username: string
          username_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          comments_count?: number
          created_at?: string
          display_name?: string | null
          favorites_count?: number
          followers_count?: number
          following_count?: number
          id: string
          is_private?: boolean
          onboarding_completed_at?: string | null
          platforms?: string[]
          role?: Database['public']['Enums']['user_role']
          suspended_until?: string | null
          updated_at?: string
          username: string
          username_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          comments_count?: number
          created_at?: string
          display_name?: string | null
          favorites_count?: number
          followers_count?: number
          following_count?: number
          id?: string
          is_private?: boolean
          onboarding_completed_at?: string | null
          platforms?: string[]
          role?: Database['public']['Enums']['user_role']
          suspended_until?: string | null
          updated_at?: string
          username?: string
          username_changed_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          comment_id: number
          created_at: string
          details: string | null
          id: number
          reason: Database['public']['Enums']['report_reason']
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database['public']['Enums']['report_status']
        }
        Insert: {
          comment_id: number
          created_at?: string
          details?: string | null
          id?: never
          reason: Database['public']['Enums']['report_reason']
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database['public']['Enums']['report_status']
        }
        Update: {
          comment_id?: number
          created_at?: string
          details?: string | null
          id?: never
          reason?: Database['public']['Enums']['report_reason']
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database['public']['Enums']['report_status']
        }
        Relationships: [
          {
            foreignKeyName: 'reports_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_resolved_by_fkey'
            columns: ['resolved_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      trending_games: {
        Row: {
          game_id: number | null
          score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_username_available: { Args: { candidate: string }; Returns: boolean }
      moderate_comment: {
        Args: { decision: string; reason?: string; target_comment_id: number }
        Returns: undefined
      }
      normalize_text: { Args: { value: string }; Returns: string }
      refresh_trending_games: { Args: never; Returns: undefined }
      search_games: {
        Args: { max_results?: number; query: string }
        Returns: {
          age_rating: string | null
          background_image_id: string | null
          comments_count: number
          cover_image_id: string | null
          created_at: string
          critic_score: number | null
          favorites_count: number
          id: number
          igdb_id: number
          popularity: number
          release_date: string | null
          slug: string
          summary_en: string | null
          summary_es: string | null
          synced_at: string
          title: string
          title_normalized: string | null
          user_score_external: number | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'games'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      suspend_user: {
        Args: { days: number; reason?: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      comment_status: 'visible' | 'hidden' | 'deleted'
      company_role: 'developer' | 'publisher'
      follow_status: 'accepted' | 'pending'
      media_type: 'screenshot' | 'trailer'
      moderation_action_type: 'restore_comment' | 'delete_comment' | 'suspend_user' | 'unsuspend_user'
      notification_type: 'new_follower' | 'follow_request' | 'comment_liked' | 'comment_moderated'
      report_reason: 'spam' | 'offensive' | 'spoiler' | 'other'
      report_status: 'open' | 'resolved'
      user_role: 'user' | 'moderator' | 'admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      comment_status: ['visible', 'hidden', 'deleted'],
      company_role: ['developer', 'publisher'],
      follow_status: ['accepted', 'pending'],
      media_type: ['screenshot', 'trailer'],
      moderation_action_type: ['restore_comment', 'delete_comment', 'suspend_user', 'unsuspend_user'],
      notification_type: ['new_follower', 'follow_request', 'comment_liked', 'comment_moderated'],
      report_reason: ['spam', 'offensive', 'spoiler', 'other'],
      report_status: ['open', 'resolved'],
      user_role: ['user', 'moderator', 'admin'],
    },
  },
} as const
