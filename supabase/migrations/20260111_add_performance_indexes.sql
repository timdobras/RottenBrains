-- Performance indexes for RottenBrains database optimization
-- Created: 2026-01-10

-- ============================================
-- WATCH_HISTORY TABLE INDEXES
-- ============================================

-- Composite index for single item lookups (used by getWatchTime, upsertWatchHistory)
-- Covers: user_id + media_type + media_id + season_number + episode_number
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_history_user_media_lookup
ON watch_history(user_id, media_type, media_id, season_number, episode_number);

-- Index for user's recent watch history sorted by date (used by get_next_episodes, continue watching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_history_user_created_desc
ON watch_history(user_id, created_at DESC);

-- Partial index for batch watch time queries (only movies and TV shows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_history_batch_lookup
ON watch_history(user_id, media_type, media_id)
WHERE media_type IN ('movie', 'tv');

-- ============================================
-- POSTS TABLE INDEXES
-- ============================================

-- Index for fetching posts by creator (used by getUserPosts, getPostCount)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_creatorid
ON posts(creatorid);

-- Composite index for media-specific post queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_media_lookup
ON posts(media_type, media_id);

-- ============================================
-- FOLLOWS TABLE INDEXES
-- ============================================

-- Index for getting followers of a user (used by getFollowers)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_following_id
ON follows(following_id);

-- Index for getting who a user follows (used by getFollowing, fetch_posts_from_followed_users)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_user_id
ON follows(user_id);

-- ============================================
-- COMMENTS TABLE INDEXES
-- ============================================

-- Index for fetching comments by post (used by getPostComments, fetch_comments_by_post_id)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_id
ON comments(post_id);

-- Index for fetching replies to a comment (used by getCommentReplies, fetch_replies_by_comment_id)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent_id
ON comments(parent_id)
WHERE parent_id IS NOT NULL;

-- ============================================
-- NEW_EPISODES TABLE INDEXES
-- ============================================

-- Index for fetching user's new episodes sorted by air date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_new_episodes_user_airdate
ON new_episodes(user_id, last_air_date DESC);
