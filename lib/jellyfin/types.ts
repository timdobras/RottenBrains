/**
 * Jellyfin API types and webhook payload types
 * Used for bidirectional watch sync between RottenBrains and Jellyfin
 */

// ============================================================
// Database types
// ============================================================

/**
 * A user's resolved Jellyfin connection.
 *
 * This is no longer a single DB row — it is composed from a family-owned
 * `family_integrations` row (server_url / shared api_key / webhook_secret) joined
 * with the user's own `integration_member_links` row (their Jellyfin account +
 * personal access token). The shape is kept identical to the old single-table
 * config so all downstream consumers (client.ts, webhook, resolve) are unchanged.
 */
export interface JellyfinConfig {
  /** integration_member_links.id */
  id: string;
  user_id: string;
  server_url: string;
  /** The member's per-user access token (preferred) or the integration's shared key — both use X-Emby-Token */
  api_key: string;
  jellyfin_user_id: string;
  jellyfin_username: string | null;
  sync_enabled: boolean;
  webhook_secret: string;
  created_at: string;
  updated_at: string;
}

/** A family-owned Jellyfin integration (the shared server connection). */
export interface JellyfinIntegration {
  id: string;
  family_id: string;
  server_url: string | null;
  api_key: string | null;
  webhook_secret: string;
}

export type SyncSource = 'app' | 'jellyfin';

// ============================================================
// Authentication types
// ============================================================

export interface JellyfinAuthResponse {
  User: {
    Id: string;
    Name: string;
    ServerId: string;
  };
  AccessToken: string;
  ServerId: string;
}

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
  /** Playback position in seconds, used for resume in the Videasy player */
  playbackPosition?: number | null;
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
