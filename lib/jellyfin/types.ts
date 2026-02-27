/**
 * Jellyfin API types and webhook payload types
 * Used for bidirectional watch sync between RottenBrains and Jellyfin
 */

// ============================================================
// Database types
// ============================================================

export interface JellyfinConfig {
  id: string;
  user_id: string;
  server_url: string;
  api_key: string;
  jellyfin_user_id: string;
  sync_enabled: boolean;
  webhook_secret: string;
  created_at: string;
  updated_at: string;
}

export interface JellyfinSyncLogEntry {
  id: string;
  user_id: string;
  direction: 'to_jellyfin' | 'from_jellyfin';
  media_type: string;
  media_id: number;
  season_number: number | null;
  episode_number: number | null;
  status: 'success' | 'skipped' | 'error';
  error_message: string | null;
  created_at: string;
}

export type SyncSource = 'app' | 'jellyfin';

// ============================================================
// Jellyfin API response types
// ============================================================

export interface JellyfinUser {
  Id: string;
  Name: string;
  ServerId: string;
  HasPassword: boolean;
  HasConfiguredPassword: boolean;
  HasConfiguredEasyPassword: boolean;
  EnableAutoLogin: boolean;
}

export interface JellyfinServerInfo {
  ServerName: string;
  Version: string;
  Id: string;
}

export interface JellyfinProviderIds {
  Tmdb?: string;
  Imdb?: string;
  Tvdb?: string;
  [key: string]: string | undefined;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: 'Movie' | 'Series' | 'Episode' | 'Season' | string;
  ProviderIds: JellyfinProviderIds;
  RunTimeTicks?: number;
  UserData?: {
    PlaybackPositionTicks: number;
    PlayCount: number;
    IsFavorite: boolean;
    Played: boolean;
    PlayedPercentage?: number;
  };
  SeriesId?: string;
  SeriesName?: string;
  SeasonName?: string;
  ParentIndexNumber?: number; // Season number for episodes
  IndexNumber?: number; // Episode number
  MediaType?: string;
}

export interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

// ============================================================
// Jellyfin webhook payload types
// Sent by the Jellyfin Webhook plugin
// ============================================================

export type JellyfinWebhookEventType =
  | 'PlaybackStart'
  | 'PlaybackStop'
  | 'PlaybackProgress'
  | 'MarkPlayed'
  | 'MarkUnplayed';

export interface JellyfinWebhookPayload {
  Event?: string;
  NotificationType?: string;
  Item?: {
    Id: string;
    Name: string;
    Type: string;
    ProviderIds?: JellyfinProviderIds;
    RunTimeTicks?: number;
    ParentIndexNumber?: number;
    IndexNumber?: number;
    SeriesId?: string;
    SeriesName?: string;
  };
  User?: {
    Id: string;
    Name: string;
  };
  PlaybackInfo?: {
    PositionTicks?: number;
    PlayedPercentage?: number;
    IsPaused?: boolean;
  };
  // Some webhook plugin versions use a flat structure
  PlaybackPositionTicks?: number;
  ItemId?: string;
  UserId?: string;
}

// ============================================================
// Sync operation types
// ============================================================

export interface SyncToJellyfinParams {
  userId: string;
  mediaType: string;
  mediaId: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
  percentageWatched: number;
  timeSpent: number;
}

export interface SyncFromJellyfinParams {
  userId: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  seasonNumber: number | null;
  episodeNumber: number | null;
  percentageWatched: number;
  timeSpent: number;
}

export interface SyncResult {
  success: boolean;
  action: 'synced' | 'skipped' | 'error';
  message: string;
}

export interface PollResult {
  success: boolean;
  itemsProcessed: number;
  itemsSynced: number;
  itemsSkipped: number;
  errors: string[];
}

// ============================================================
// Validation/config types
// ============================================================

export interface ValidateConnectionResult {
  valid: boolean;
  serverName?: string;
  error?: string;
}
