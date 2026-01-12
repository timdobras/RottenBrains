/**
 * Mock watch history data for offline development
 */

export interface MockWatchHistory {
  id: string;
  user_id: string;
  media_type: 'movie' | 'tv';
  media_id: number;
  season_number: number | null;
  episode_number: number | null;
  percentage_watched: number;
  watch_time: number; // in seconds
  last_watched: string;
  created_at: string;
}

export const mockWatchHistory: MockWatchHistory[] = [
  // User 1 watch history
  {
    id: 'watch-1',
    user_id: 'mock-user-1',
    media_type: 'movie',
    media_id: 1001,
    season_number: null,
    episode_number: null,
    percentage_watched: 45,
    watch_time: 3996, // 45% of 148 min
    last_watched: '2024-12-20T20:30:00Z',
    created_at: '2024-12-20T19:00:00Z',
  },
  {
    id: 'watch-2',
    user_id: 'mock-user-1',
    media_type: 'movie',
    media_id: 1004,
    season_number: null,
    episode_number: null,
    percentage_watched: 92,
    watch_time: 8611,
    last_watched: '2024-12-19T23:00:00Z',
    created_at: '2024-12-19T20:30:00Z',
  },
  {
    id: 'watch-3',
    user_id: 'mock-user-1',
    media_type: 'tv',
    media_id: 2001,
    season_number: 3,
    episode_number: 5,
    percentage_watched: 67,
    watch_time: 2332,
    last_watched: '2024-12-18T21:00:00Z',
    created_at: '2024-12-18T20:00:00Z',
  },
  {
    id: 'watch-4',
    user_id: 'mock-user-1',
    media_type: 'tv',
    media_id: 2003,
    season_number: 2,
    episode_number: 12,
    percentage_watched: 100,
    watch_time: 1440,
    last_watched: '2024-12-17T22:30:00Z',
    created_at: '2024-12-17T22:00:00Z',
  },
  {
    id: 'watch-5',
    user_id: 'mock-user-1',
    media_type: 'movie',
    media_id: 1007,
    season_number: null,
    episode_number: null,
    percentage_watched: 100,
    watch_time: 8520,
    last_watched: '2024-12-16T23:30:00Z',
    created_at: '2024-12-16T21:00:00Z',
  },
  // User 2 watch history
  {
    id: 'watch-6',
    user_id: 'mock-user-2',
    media_type: 'movie',
    media_id: 1003,
    season_number: null,
    episode_number: null,
    percentage_watched: 78,
    watch_time: 5850,
    last_watched: '2024-12-20T22:00:00Z',
    created_at: '2024-12-20T20:00:00Z',
  },
  {
    id: 'watch-7',
    user_id: 'mock-user-2',
    media_type: 'tv',
    media_id: 2002,
    season_number: 1,
    episode_number: 6,
    percentage_watched: 35,
    watch_time: 1092,
    last_watched: '2024-12-19T21:00:00Z',
    created_at: '2024-12-19T20:30:00Z',
  },
];

// Helper functions
export const getMockWatchHistoryForUser = (userId: string): MockWatchHistory[] => {
  return mockWatchHistory
    .filter((w) => w.user_id === userId)
    .sort((a, b) => new Date(b.last_watched).getTime() - new Date(a.last_watched).getTime());
};

export const getMockContinueWatching = (userId: string): MockWatchHistory[] => {
  return mockWatchHistory
    .filter((w) => w.user_id === userId && w.percentage_watched < 90 && w.percentage_watched > 0)
    .sort((a, b) => new Date(b.last_watched).getTime() - new Date(a.last_watched).getTime());
};

export const getMockWatchProgress = (
  userId: string,
  mediaType: 'movie' | 'tv',
  mediaId: number,
  seasonNumber?: number,
  episodeNumber?: number
): MockWatchHistory | undefined => {
  return mockWatchHistory.find(
    (w) =>
      w.user_id === userId &&
      w.media_type === mediaType &&
      w.media_id === mediaId &&
      (seasonNumber === undefined || w.season_number === seasonNumber) &&
      (episodeNumber === undefined || w.episode_number === episodeNumber)
  );
};

export const getMockBatchWatchProgress = (
  userId: string,
  items: { media_type: string; media_id: number }[]
): Record<string, number> => {
  const result: Record<string, number> = {};

  items.forEach(({ media_type, media_id }) => {
    const key = `${media_type}_${media_id}`;
    const watchItem = mockWatchHistory.find(
      (w) => w.user_id === userId && w.media_type === media_type && w.media_id === media_id
    );
    result[key] = watchItem?.percentage_watched || 0;
  });

  return result;
};
