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
    PostgrestVersion: "12.1 (8cbcf98)"
  }
  public: {
    Tables: {
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          post_id: string | null
          total_likes: number
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string | null
          total_likes?: number
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string | null
          total_likes?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
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
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_blog: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          features: string[] | null
          id: string
          images: string[] | null
          slug: string
          tags: string[] | null
          thumbnail: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          slug: string
          tags?: string[] | null
          thumbnail?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          slug?: string
          tags?: string[] | null
          thumbnail?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          following_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          following_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          following_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_genre_stats: {
        Row: {
          "10402": number
          "10749": number
          "10751": number
          "10752": number
          "10770": number
          "12": number
          "14": number
          "16": number
          "18": number
          "27": number
          "28": number
          "35": number
          "36": number
          "37": number
          "53": number
          "80": number
          "878": number
          "9648": number
          "99": number
          id: string
          user_id: string
        }
        Insert: {
          "10402"?: number
          "10749"?: number
          "10751"?: number
          "10752"?: number
          "10770"?: number
          "12"?: number
          "14"?: number
          "16"?: number
          "18"?: number
          "27"?: number
          "28"?: number
          "35"?: number
          "36"?: number
          "37"?: number
          "53"?: number
          "80"?: number
          "878"?: number
          "9648"?: number
          "99"?: number
          id?: string
          user_id: string
        }
        Update: {
          "10402"?: number
          "10749"?: number
          "10751"?: number
          "10752"?: number
          "10770"?: number
          "12"?: number
          "14"?: number
          "16"?: number
          "18"?: number
          "27"?: number
          "28"?: number
          "35"?: number
          "36"?: number
          "37"?: number
          "53"?: number
          "80"?: number
          "878"?: number
          "9648"?: number
          "99"?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_genre_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      new_episodes: {
        Row: {
          created_at: string
          episode_number: number | null
          id: string
          last_air_date: string | null
          season_number: number | null
          tv_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_number?: number | null
          id?: string
          last_air_date?: string | null
          season_number?: number | null
          tv_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          episode_number?: number | null
          id?: string
          last_air_date?: string | null
          season_number?: number | null
          tv_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          comment_id: string | null
          created_at: string | null
          episode_number: number | null
          id: string
          media_id: number | null
          media_type: string | null
          post_id: string | null
          read: boolean
          recipient_id: string
          season_number: number | null
          triggered_by: string | null
          type: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          episode_number?: number | null
          id?: string
          media_id?: number | null
          media_type?: string | null
          post_id?: string | null
          read?: boolean
          recipient_id: string
          season_number?: number | null
          triggered_by?: string | null
          type: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          episode_number?: number | null
          id?: string
          media_id?: number | null
          media_type?: string | null
          post_id?: string | null
          read?: boolean
          recipient_id?: string
          season_number?: number | null
          triggered_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          created_at: string | null
          creatorid: string | null
          id: string
          image_path: string | null
          media_id: number | null
          media_type: string | null
          review_user: string | null
          season_number: number | null
          total_comments: number
          total_likes: number | null
          vote_user: number | null
        }
        Insert: {
          created_at?: string | null
          creatorid?: string | null
          id?: string
          image_path?: string | null
          media_id?: number | null
          media_type?: string | null
          review_user?: string | null
          season_number?: number | null
          total_comments?: number
          total_likes?: number | null
          vote_user?: number | null
        }
        Update: {
          created_at?: string | null
          creatorid?: string | null
          id?: string
          image_path?: string | null
          media_id?: number | null
          media_type?: string | null
          review_user?: string | null
          season_number?: number | null
          total_comments?: number
          total_likes?: number | null
          vote_user?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_creatorid_fkey"
            columns: ["creatorid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_genre_stats: {
        Row: {
          "10751": number
          "10759": number
          "10762": number
          "10763": number
          "10764": number
          "10765": number
          "10766": number
          "10767": number
          "10768": number
          "16": number
          "18": number
          "35": number
          "37": number
          "80": number
          "9648": number
          "99": number
          id: string
          user_id: string | null
        }
        Insert: {
          "10751"?: number
          "10759"?: number
          "10762"?: number
          "10763"?: number
          "10764"?: number
          "10765"?: number
          "10766"?: number
          "10767"?: number
          "10768"?: number
          "16"?: number
          "18"?: number
          "35"?: number
          "37"?: number
          "80"?: number
          "9648"?: number
          "99"?: number
          id?: string
          user_id?: string | null
        }
        Update: {
          "10751"?: number
          "10759"?: number
          "10762"?: number
          "10763"?: number
          "10764"?: number
          "10765"?: number
          "10766"?: number
          "10767"?: number
          "10768"?: number
          "16"?: number
          "18"?: number
          "35"?: number
          "37"?: number
          "80"?: number
          "9648"?: number
          "99"?: number
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_genre_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ip_addresses: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          is_trusted: boolean | null
          label: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address: unknown
          is_trusted?: boolean | null
          label?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_trusted?: boolean | null
          label?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_ip_addresses_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          family_id: string
          id: string
          max_uses: number | null
          uses: number
        }
        Insert: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          family_id: string
          id?: string
          max_uses?: number | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          family_id?: string
          id?: string
          max_uses?: number | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_integrations: {
        Row: {
          api_key: string | null
          config: Json
          created_at: string
          created_by: string | null
          family_id: string
          id: string
          server_url: string | null
          type: string
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          api_key?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          family_id: string
          id?: string
          server_url?: string | null
          type: string
          updated_at?: string
          webhook_secret?: string
        }
        Update: {
          api_key?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          family_id?: string
          id?: string
          server_url?: string | null
          type?: string
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_integrations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_member_links: {
        Row: {
          access_token: string | null
          created_at: string
          external_user_id: string | null
          external_username: string | null
          id: string
          integration_id: string
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          external_username?: string | null
          id?: string
          integration_id: string
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          external_username?: string | null
          id?: string
          integration_id?: string
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_member_links_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "family_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_jellyfin_config: {
        Row: {
          api_key: string
          created_at: string
          id: string
          jellyfin_user_id: string
          jellyfin_username: string | null
          server_url: string
          sync_enabled: boolean
          updated_at: string
          user_id: string
          webhook_secret: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          jellyfin_user_id: string
          jellyfin_username?: string | null
          server_url: string
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
          webhook_secret?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          jellyfin_user_id?: string
          jellyfin_username?: string | null
          server_url?: string
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          backdrop_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          feed_genres: Json[] | null
          id: string
          image_url: string | null
          name: string | null
          premium: boolean
          tmdb_id: string | null
          username: string | null
        }
        Insert: {
          backdrop_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          feed_genres?: Json[] | null
          id: string
          image_url?: string | null
          name?: string | null
          premium?: boolean
          tmdb_id?: string | null
          username?: string | null
        }
        Update: {
          backdrop_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          feed_genres?: Json[] | null
          id?: string
          image_url?: string | null
          name?: string | null
          premium?: boolean
          tmdb_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          created_at: string | null
          episode_number: number | null
          hidden_until: string | null
          id: string
          media_id: number
          media_type: string
          percentage_watched: string | null
          playback_position: number | null
          season_number: number | null
          sync_source: string
          time_spent: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          episode_number?: number | null
          hidden_until?: string | null
          id?: string
          media_id: number
          media_type: string
          percentage_watched?: string | null
          playback_position?: number | null
          season_number?: number | null
          sync_source?: string
          time_spent?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          episode_number?: number | null
          hidden_until?: string | null
          id?: string
          media_id?: number
          media_type?: string
          percentage_watched?: string | null
          playback_position?: number | null
          season_number?: number | null
          sync_source?: string
          time_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_list: {
        Row: {
          created_at: string
          id: string
          media_id: number | null
          media_type: string | null
          user_id: string | null
          watch_list_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_id?: number | null
          media_type?: string | null
          user_id?: string | null
          watch_list_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: number | null
          media_type?: string | null
          user_id?: string | null
          watch_list_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_list_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_to_watch_list: {
        Args: {
          p_media_id: number
          p_media_type: string
          p_user_id: string
          p_watch_list_type: string
        }
        Returns: string
      }
      check_watch_history_exists: {
        Args: {
          p_episode_number?: number
          p_media_id: number
          p_media_type: string
          p_season_number?: number
          p_user_id: string
        }
        Returns: boolean
      }
      decrement_comment_likes: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      decrement_comments: { Args: { post_id: string }; Returns: undefined }
      decrement_likes: { Args: { post_id: string }; Returns: undefined }
      fetch_comments_by_post_id: {
        Args: { current_user_id?: string; p_post_id: string }
        Returns: Json
      }
      fetch_post_by_id: {
        Args: { current_user_id?: string; p_post_id: string }
        Returns: Json
      }
      fetch_post_with_comments_by_id: {
        Args: { current_user_id?: string; p_post_id: string }
        Returns: Json
      }
      fetch_posts_by_media: {
        Args: {
          current_user_id: string
          media_id_param: number
          media_type_param: string
          result_limit: number
          result_offset: number
        }
        Returns: {
          created_at: string
          creator_email: string
          creator_image_url: string
          creator_name: string
          creator_tmdb_id: string
          creator_username: string
          creatorid: string
          has_liked: boolean
          has_saved: boolean
          media_id: number
          media_type: string
          post_id: string
          review_user: string
          total_comments: number
          total_likes: number
          vote_user: number
        }[]
      }
      fetch_posts_from_followed_users: {
        Args: {
          current_user_id: string
          result_limit: number
          result_offset: number
        }
        Returns: Json[]
      }
      fetch_replies_by_comment_id: {
        Args: { current_user_id?: string; p_comment_id: string }
        Returns: Json
      }
      fetch_user_liked_posts:
        | {
            Args: {
              creator_id: string
              current_user_id: string
              result_limit: number
              result_offset: number
            }
            Returns: {
              created_at: string
              creator_email: string
              creator_image_url: string
              creator_name: string
              creator_tmdb_id: string
              creator_username: string
              creatorid: string
              has_liked: boolean
              has_saved: boolean
              media_id: number
              media_type: string
              post_id: string
              review_user: string
              total_comments: number
              total_likes: number
              vote_user: number
            }[]
          }
        | {
            Args: {
              current_user_id: string
              result_limit: number
              result_offset: number
            }
            Returns: {
              created_at: string
              creator_email: string
              creator_image_url: string
              creator_name: string
              creator_tmdb_id: string
              creator_username: string
              creatorid: string
              has_saved: boolean
              media_type: string
              mediaid: number
              post_id: string
              review_user: string
              total_comments: number
              total_likes: number
              vote_user: number
            }[]
          }
      fetch_user_posts: {
        Args: {
          creator_id: string
          current_user_id?: string
          result_limit?: number
          result_offset?: number
        }
        Returns: Json[]
      }
      fetch_user_posts_type:
        | {
            Args: {
              creator_id: string
              current_user_id?: string
              media_type_filter?: string
              result_limit?: number
              result_offset?: number
            }
            Returns: Json[]
          }
        | {
            Args: {
              creator_id: string
              current_user_id?: string
              result_limit?: number
              result_offset?: number
            }
            Returns: {
              created_at: string
              creator_email: string
              creator_image_url: string
              creator_name: string
              creator_tmdb_id: string
              creator_username: string
              creatorid: string
              has_liked: boolean
              has_saved: boolean
              media_id: number
              media_type: string
              post_id: string
              review_user: string
              total_comments: number
              total_likes: number
              vote_user: number
            }[]
          }
      fetch_user_saved_posts: {
        Args: {
          creator_id: string
          current_user_id: string
          result_limit: number
          result_offset: number
        }
        Returns: {
          created_at: string
          creator_email: string
          creator_image_url: string
          creator_name: string
          creator_tmdb_id: string
          creator_username: string
          creatorid: string
          has_liked: boolean
          has_saved: boolean
          media_id: number
          media_type: string
          post_id: string
          review_user: string
          total_comments: number
          total_likes: number
          vote_user: number
        }[]
      }
      get_batch_percentage_watched: {
        Args: { p_items: Json; p_user_id: string }
        Returns: {
          episode_number: number
          media_id: number
          media_type: string
          percentage_watched: number
          season_number: number
        }[]
      }
      get_batch_watched_items: {
        Args: { input_items: Json; input_user_id: string }
        Returns: {
          media_id: number
          media_type: string
        }[]
      }
      get_continue_watching: {
        Args: { user_id_input: string }
        Returns: {
          episode_number: number
          media_id: number
          media_type: string
          season_number: number
        }[]
      }
      get_next_episodes: {
        Args: { user_id_input: string }
        Returns: {
          episode_number: number
          media_id: number
          media_type: string
          next_episode: boolean
          season_number: number
        }[]
      }
      get_percentage_watched: {
        Args: {
          p_episode_number?: number
          p_media_id: number
          p_media_type: string
          p_season_number?: number
          p_user_id: string
        }
        Returns: string
      }
      get_playback_position: {
        Args: {
          p_episode_number?: number
          p_media_id: number
          p_media_type: string
          p_season_number?: number
          p_user_id: string
        }
        Returns: number
      }
      get_top_movie_genres_for_user: {
        Args: { p_user_id: string }
        Returns: {
          genre_code: string
          value: number
        }[]
      }
      get_top_tv_genres_for_user: {
        Args: { p_user_id: string }
        Returns: {
          genre_code: string
          value: number
        }[]
      }
      get_up_next_episodes: {
        Args: { user_id_input: string }
        Returns: {
          episode_number: number
          media_id: number
          media_type: string
          season_number: number
        }[]
      }
      get_user_notifications: {
        Args: { _limit?: number; _offset?: number; _recipient_id: string }
        Returns: {
          comment: Json
          created_at: string
          episode_number: number
          is_read: boolean
          media_id: number
          media_type: string
          notification_id: string
          notification_type: string
          parent_comment: Json
          post: Json
          season_number: number
          triggered_by_user: Json
        }[]
      }
      get_watch_history_for_user:
        | {
            Args: { p_user_id: string }
            Returns: {
              created_at: string
              episode_number: number
              media_id: number
              media_type: string
              season_id: number
              user_id: string
            }[]
          }
        | {
            Args: { p_limit: number; p_offset: number; p_user_id: string }
            Returns: {
              created_at: string
              episode_number: number
              media_id: number
              media_type: string
              percentage_watched: string
              season_number: number
              time_spent: number
              user_id: string
            }[]
          }
      get_watch_later:
        | {
            Args: { p_limit: number; p_offset: number; p_user_id: string }
            Returns: {
              created_at: string
              id: string
              media_id: number
              media_type: string
              user_id: string
              watch_list_type: string
            }[]
          }
        | {
            Args: { user_id_input: string }
            Returns: {
              created_at: string
              id: number
              media_id: number
              media_type: string
              user_id: string
              watch_list_type: string
            }[]
          }
      get_watch_later_entries: {
        Args: { p_media_id: number; p_media_type: string; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          media_id: number
          media_type: string
          user_id: string
          watch_list_type: string
        }[]
      }
      get_watch_list_full: {
        Args: { p_limit: number; p_offset: number; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          media_id: number
          media_type: string
          user_id: string
          watch_list_type: string
        }[]
      }
      get_watch_list_specific: {
        Args: {
          p_limit: number
          p_offset: number
          p_user_id: string
          p_watch_list_type: string
        }
        Returns: {
          created_at: string
          id: string
          media_id: number
          media_type: string
          user_id: string
          watch_list_type: string
        }[]
      }
      get_watched_items: {
        Args: {
          input_movies: number[]
          input_tvshows: number[]
          input_user_id: string
        }
        Returns: {
          media_id: number
          media_type: string
        }[]
      }
      increment_comment_likes: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      increment_comments: { Args: { post_id: string }; Returns: undefined }
      increment_likes: { Args: { post_id: string }; Returns: undefined }
      is_item_watched: {
        Args: {
          input_media_id: number
          input_media_type: string
          input_user_id: string
        }
        Returns: boolean
      }
      remove_movie_duplicates: { Args: never; Returns: undefined }
      update_genre_stats: {
        Args: { genre_ids: number[]; media_type: string; user_id: string }
        Returns: undefined
      }
      upsert_watch_history_atomic:
        | {
            Args: {
              p_episode_number?: number
              p_media_id: number
              p_media_type: string
              p_new_percentage: number
              p_new_time_spent: number
              p_season_number?: number
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_episode_number?: number
              p_media_id: number
              p_media_type: string
              p_new_percentage: number
              p_new_time_spent: number
              p_playback_position?: number
              p_season_number?: number
              p_sync_source?: string
              p_user_id: string
            }
            Returns: Json
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
