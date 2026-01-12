/**
 * Mock posts/reviews data for offline development
 */

import { MOCK_CURRENT_USER_ID } from './users';

export interface MockPost {
  id: string;
  user_id: string;
  media_type: 'movie' | 'tv';
  media_id: number;
  rating: number | null;
  review: string | null;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
}

export interface MockComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  likes_count: number;
}

export interface MockLike {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface MockSave {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

// Using real TMDB IDs from the mock data:
// Movies: 129 (Spirited Away), 155 (The Dark Knight), 238 (The Godfather), 240, 278 (Shawshank), 389, 424, 497
// TV: 456 (The Simpsons), 1396 (Breaking Bad), 1399 (Game of Thrones), 1407, 1408
export const mockPosts: MockPost[] = [
  {
    id: 'post-1',
    user_id: 'mock-user-1',
    media_type: 'movie',
    media_id: 129, // Spirited Away
    rating: 9,
    review:
      'Absolutely incredible! Spirited Away exceeded all my expectations. The animation is breathtaking and the storytelling is top-notch. A must-watch for any anime fan.',
    created_at: '2024-12-15T14:30:00Z',
    updated_at: '2024-12-15T14:30:00Z',
    likes_count: 24,
    comments_count: 5,
  },
  {
    id: 'post-2',
    user_id: 'mock-user-2',
    media_type: 'movie',
    media_id: 155, // The Dark Knight
    rating: 10,
    review:
      "The Dark Knight is a masterpiece. Heath Ledger's Joker performance is legendary. The atmosphere is perfectly crafted and the story keeps you on the edge of your seat.",
    created_at: '2024-12-14T20:00:00Z',
    updated_at: '2024-12-14T20:00:00Z',
    likes_count: 42,
    comments_count: 8,
  },
  {
    id: 'post-3',
    user_id: 'mock-user-1',
    media_type: 'tv',
    media_id: 1396, // Breaking Bad
    rating: 10,
    review:
      'Breaking Bad is a masterpiece of television. The storytelling, acting, and production value are all exceptional. The final season wrapped up everything perfectly.',
    created_at: '2024-12-13T10:15:00Z',
    updated_at: '2024-12-13T10:15:00Z',
    likes_count: 89,
    comments_count: 15,
  },
  {
    id: 'post-4',
    user_id: 'mock-user-2',
    media_type: 'movie',
    media_id: 238, // The Godfather
    rating: 9,
    review:
      'The Godfather is timeless. The performances, especially Marlon Brando, are unforgettable. A true classic that everyone should watch at least once.',
    created_at: '2024-12-12T16:45:00Z',
    updated_at: '2024-12-12T16:45:00Z',
    likes_count: 56,
    comments_count: 12,
  },
  {
    id: 'post-5',
    user_id: 'mock-user-1',
    media_type: 'movie',
    media_id: 278, // Shawshank Redemption
    rating: 10,
    review:
      'The Shawshank Redemption is one of the greatest films ever made. The story of hope and friendship is incredibly moving.',
    created_at: '2024-12-11T09:00:00Z',
    updated_at: '2024-12-11T09:00:00Z',
    likes_count: 31,
    comments_count: 4,
  },
  {
    id: 'post-6',
    user_id: 'mock-user-2',
    media_type: 'tv',
    media_id: 1399, // Game of Thrones
    rating: 8,
    review:
      'Game of Thrones is an epic fantasy series. Despite the controversial ending, the earlier seasons are some of the best television ever produced.',
    created_at: '2024-12-10T21:30:00Z',
    updated_at: '2024-12-10T21:30:00Z',
    likes_count: 67,
    comments_count: 9,
  },
  {
    id: 'post-7',
    user_id: 'mock-user-1',
    media_type: 'movie',
    media_id: 424, // Schindler's List
    rating: 10,
    review:
      "Schindler's List is powerful and heartbreaking. Spielberg's direction and Liam Neeson's performance are extraordinary.",
    created_at: '2024-12-09T12:00:00Z',
    updated_at: '2024-12-09T12:00:00Z',
    likes_count: 18,
    comments_count: 2,
  },
  {
    id: 'post-8',
    user_id: 'mock-user-2',
    media_type: 'tv',
    media_id: 456, // The Simpsons
    rating: 8,
    review:
      'The Simpsons is iconic. The earlier seasons are comedy gold and the show has influenced so much of pop culture.',
    created_at: '2024-12-08T15:20:00Z',
    updated_at: '2024-12-08T15:20:00Z',
    likes_count: 45,
    comments_count: 7,
  },
];

export const mockComments: MockComment[] = [
  {
    id: 'comment-1',
    post_id: 'post-1',
    user_id: 'mock-user-2',
    content: 'Totally agree! The visual effects were stunning.',
    parent_id: null,
    created_at: '2024-12-15T15:00:00Z',
    likes_count: 5,
  },
  {
    id: 'comment-2',
    post_id: 'post-1',
    user_id: 'mock-user-1',
    content: 'Thanks! The director really outdid themselves.',
    parent_id: 'comment-1',
    created_at: '2024-12-15T15:30:00Z',
    likes_count: 2,
  },
  {
    id: 'comment-3',
    post_id: 'post-2',
    user_id: 'mock-user-1',
    content: 'I was so scared during the basement scene!',
    parent_id: null,
    created_at: '2024-12-14T21:00:00Z',
    likes_count: 8,
  },
  {
    id: 'comment-4',
    post_id: 'post-3',
    user_id: 'mock-user-2',
    content: 'The ending had me in tears. What a journey!',
    parent_id: null,
    created_at: '2024-12-13T11:00:00Z',
    likes_count: 12,
  },
];

export const mockLikes: MockLike[] = [
  { id: 'like-1', user_id: 'mock-user-2', post_id: 'post-1', created_at: '2024-12-15T15:00:00Z' },
  { id: 'like-2', user_id: 'mock-user-1', post_id: 'post-2', created_at: '2024-12-14T21:00:00Z' },
  { id: 'like-3', user_id: 'mock-user-2', post_id: 'post-3', created_at: '2024-12-13T11:00:00Z' },
  { id: 'like-4', user_id: 'mock-user-1', post_id: 'post-4', created_at: '2024-12-12T17:00:00Z' },
];

export const mockSaves: MockSave[] = [
  { id: 'save-1', user_id: 'mock-user-1', post_id: 'post-2', created_at: '2024-12-14T22:00:00Z' },
  { id: 'save-2', user_id: 'mock-user-1', post_id: 'post-4', created_at: '2024-12-12T18:00:00Z' },
  { id: 'save-3', user_id: 'mock-user-2', post_id: 'post-1', created_at: '2024-12-15T16:00:00Z' },
];

// Helper functions
export const getMockPostById = (id: string): MockPost | undefined => {
  return mockPosts.find((p) => p.id === id);
};

export const getMockPostsByUser = (userId: string): MockPost[] => {
  return mockPosts.filter((p) => p.user_id === userId);
};

export const getMockPostsByMedia = (mediaType: 'movie' | 'tv', mediaId: number): MockPost[] => {
  return mockPosts.filter((p) => p.media_type === mediaType && p.media_id === mediaId);
};

export const getMockCommentsForPost = (postId: string): MockComment[] => {
  return mockComments.filter((c) => c.post_id === postId);
};

export const hasUserLikedPost = (userId: string, postId: string): boolean => {
  return mockLikes.some((l) => l.user_id === userId && l.post_id === postId);
};

export const hasUserSavedPost = (userId: string, postId: string): boolean => {
  return mockSaves.some((s) => s.user_id === userId && s.post_id === postId);
};

export interface MockCreator {
  id: string;
  name: string;
  username: string;
  image_url: string | null;
}

export interface MockCurrentUser {
  is_liked: boolean;
  is_saved: boolean;
}

export interface MockFeedPost {
  post: MockPost;
  creator: MockCreator;
  current_user: MockCurrentUser;
}

export const getMockFeedPosts = (userId: string): MockFeedPost[] => {
  // Return posts from followed users wrapped in the expected structure
  // that matches the real RPC function output
  return mockPosts.slice(0, 6).map((post) => {
    const isLiked = mockLikes.some((l) => l.user_id === userId && l.post_id === post.id);
    const isSaved = mockSaves.some((s) => s.user_id === userId && s.post_id === post.id);

    // Mock creator data based on post's user_id
    const creatorData =
      post.user_id === 'mock-user-1'
        ? {
            id: 'mock-user-1',
            name: 'John Developer',
            username: 'john_dev',
            image_url:
              'https://ui-avatars.com/api/?name=John+Developer&background=6366f1&color=fff',
          }
        : {
            id: 'mock-user-2',
            name: 'Jane Reviewer',
            username: 'jane_reviews',
            image_url: 'https://ui-avatars.com/api/?name=Jane+Reviewer&background=ec4899&color=fff',
          };

    return {
      post,
      creator: creatorData,
      current_user: {
        is_liked: isLiked,
        is_saved: isSaved,
      },
    };
  });
};
