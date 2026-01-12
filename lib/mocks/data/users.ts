/**
 * Mock user data for offline development
 * 2 users for testing social features
 */

export interface MockUser {
  id: string;
  name: string;
  username: string;
  email: string;
  image_url: string | null;
  backdrop_url: string | null;
  bio: string | null;
  feed_genres: { genre_code: string; media_type: string }[];
  premium: boolean;
  created_at: string;
  updated_at: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 'mock-user-1',
    name: 'John Developer',
    username: 'john_dev',
    email: 'john@example.com',
    image_url: 'https://ui-avatars.com/api/?name=John+Developer&background=6366f1&color=fff',
    backdrop_url: null,
    bio: 'Movie enthusiast and aspiring filmmaker. I love sci-fi and action films!',
    feed_genres: [
      { genre_code: '28', media_type: 'movie' },
      { genre_code: '878', media_type: 'movie' },
      { genre_code: '18', media_type: 'tv' },
      { genre_code: '10765', media_type: 'tv' },
    ],
    premium: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'mock-user-2',
    name: 'Jane Reviewer',
    username: 'jane_reviews',
    email: 'jane@example.com',
    image_url: 'https://ui-avatars.com/api/?name=Jane+Reviewer&background=ec4899&color=fff',
    backdrop_url: null,
    bio: 'Professional film critic. Horror and drama are my specialties.',
    feed_genres: [
      { genre_code: '27', media_type: 'movie' },
      { genre_code: '18', media_type: 'movie' },
      { genre_code: '35', media_type: 'movie' },
      { genre_code: '80', media_type: 'tv' },
    ],
    premium: true,
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
];

// Currently "logged in" user for offline mode
export const MOCK_CURRENT_USER_ID = 'mock-user-1';

// Helper functions
export const getCurrentMockUser = (): MockUser => {
  return mockUsers.find((u) => u.id === MOCK_CURRENT_USER_ID) || mockUsers[0];
};

export const getMockUserById = (id: string): MockUser | undefined => {
  return mockUsers.find((u) => u.id === id);
};

export const getMockUserByUsername = (username: string): MockUser | undefined => {
  return mockUsers.find((u) => u.username === username);
};

export const searchMockUsers = (query: string): MockUser[] => {
  const lowerQuery = query.toLowerCase();
  return mockUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(lowerQuery) || u.username.toLowerCase().includes(lowerQuery)
  );
};
