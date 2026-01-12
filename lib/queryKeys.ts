/**
 * Query key factory for React Query
 * Provides structured, type-safe query keys for all data fetching operations
 */

export const queryKeys = {
  // User-related
  user: {
    all: ['user'] as const,
    current: () => [...queryKeys.user.all] as const,
  },

  // Profile-related
  profile: {
    all: ['profile'] as const,
    followers: (userId: string) => [...queryKeys.profile.all, 'followers', userId] as const,
    following: (userId: string) => [...queryKeys.profile.all, 'following', userId] as const,
    postCount: (userId: string) => [...queryKeys.profile.all, 'postCount', userId] as const,
    followStatus: (userId: string, targetUserId: string) =>
      [...queryKeys.profile.all, 'followStatus', userId, targetUserId] as const,
    stats: (userId: string) => [...queryKeys.profile.all, 'stats', userId] as const,
  },

  // Media-related
  media: {
    all: ['media'] as const,
    details: (mediaType: string, mediaId: number) =>
      [...queryKeys.media.all, 'details', mediaType, mediaId] as const,
    episode: (mediaId: number, seasonNumber: number, episodeNumber: number) =>
      [...queryKeys.media.all, 'episode', mediaId, seasonNumber, episodeNumber] as const,
    videos: (mediaType: string, mediaId: number) =>
      [...queryKeys.media.all, 'videos', mediaType, mediaId] as const,
    credits: (mediaType: string, mediaId: number) =>
      [...queryKeys.media.all, 'credits', mediaType, mediaId] as const,
  },

  // Watch history
  watchHistory: {
    all: ['watchHistory'] as const,
    forUser: (userId: string) => [...queryKeys.watchHistory.all, userId] as const,
    watchTime: (
      userId: string,
      mediaType: string,
      mediaId: number,
      seasonNumber?: number | null,
      episodeNumber?: number | null
    ) =>
      [
        ...queryKeys.watchHistory.all,
        'watchTime',
        userId,
        mediaType,
        mediaId,
        seasonNumber ?? null,
        episodeNumber ?? null,
      ] as const,
    continueWatching: (userId: string) =>
      [...queryKeys.watchHistory.all, 'continueWatching', userId] as const,
  },

  // Posts
  posts: {
    all: ['posts'] as const,
    forUser: (userId: string) => [...queryKeys.posts.all, 'user', userId] as const,
    infinite: (userId: string) => [...queryKeys.posts.all, 'infinite', userId] as const,
    single: (postId: string) => [...queryKeys.posts.all, 'single', postId] as const,
    forMedia: (mediaType: string, mediaId: number) =>
      [...queryKeys.posts.all, 'media', mediaType, mediaId] as const,
  },

  // Home page
  home: {
    all: ['home'] as const,
    infinite: (userId?: string, movieGenres?: number[], tvGenres?: number[]) =>
      [...queryKeys.home.all, 'infinite', userId, movieGenres, tvGenres] as const,
  },

  // Search
  search: {
    all: ['search'] as const,
    multi: (query: string) => [...queryKeys.search.all, 'multi', query] as const,
    users: (query: string) => [...queryKeys.search.all, 'users', query] as const,
    media: (query: string, mediaType?: string) =>
      [...queryKeys.search.all, 'media', query, mediaType] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    forUser: (userId: string) => [...queryKeys.notifications.all, userId] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    forPost: (postId: string) => [...queryKeys.comments.all, 'post', postId] as const,
    replies: (commentId: string) => [...queryKeys.comments.all, 'replies', commentId] as const,
  },
} as const;

// Type helpers for query keys
export type QueryKeys = typeof queryKeys;
