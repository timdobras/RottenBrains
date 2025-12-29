/**
 * Mock follow relationships for offline development
 */

export interface MockFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface MockNotification {
  id: string;
  user_id: string;
  type: 'follow' | 'like' | 'comment' | 'reply';
  from_user_id: string;
  post_id: string | null;
  comment_id: string | null;
  read: boolean;
  created_at: string;
}

// User 1 follows User 2
export const mockFollows: MockFollow[] = [
  {
    id: 'follow-1',
    follower_id: 'mock-user-1',
    following_id: 'mock-user-2',
    created_at: '2024-06-01T10:00:00Z',
  },
];

export const mockNotifications: MockNotification[] = [
  {
    id: 'notif-1',
    user_id: 'mock-user-1',
    type: 'like',
    from_user_id: 'mock-user-2',
    post_id: 'post-1',
    comment_id: null,
    read: false,
    created_at: '2024-12-20T15:00:00Z',
  },
  {
    id: 'notif-2',
    user_id: 'mock-user-1',
    type: 'comment',
    from_user_id: 'mock-user-2',
    post_id: 'post-1',
    comment_id: 'comment-1',
    read: false,
    created_at: '2024-12-20T14:30:00Z',
  },
  {
    id: 'notif-3',
    user_id: 'mock-user-2',
    type: 'follow',
    from_user_id: 'mock-user-1',
    post_id: null,
    comment_id: null,
    read: true,
    created_at: '2024-06-01T10:00:00Z',
  },
];

// Helper functions
export const isFollowing = (followerId: string, followingId: string): boolean => {
  return mockFollows.some(
    (f) => f.follower_id === followerId && f.following_id === followingId
  );
};

export const getFollowers = (userId: string): string[] => {
  return mockFollows
    .filter((f) => f.following_id === userId)
    .map((f) => f.follower_id);
};

export const getFollowing = (userId: string): string[] => {
  return mockFollows
    .filter((f) => f.follower_id === userId)
    .map((f) => f.following_id);
};

export const getFollowerCount = (userId: string): number => {
  return mockFollows.filter((f) => f.following_id === userId).length;
};

export const getFollowingCount = (userId: string): number => {
  return mockFollows.filter((f) => f.follower_id === userId).length;
};

export const getMockNotifications = (userId: string): MockNotification[] => {
  return mockNotifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getUnreadNotificationCount = (userId: string): number => {
  return mockNotifications.filter((n) => n.user_id === userId && !n.read).length;
};
