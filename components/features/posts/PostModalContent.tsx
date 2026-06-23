import Link from 'next/link';
import React from 'react';
import CommentSection from '../profile/CommentSection';
import PostHeader from './PostHeader';
import PostMedia from './PostMedia';

interface PostModalContentProps {
  post_media_data: any;
  // Current user's id — passed through to the header (edit affordance).
  user_id?: string;
}

/**
 * Shared post body for the intercepting post modal AND the standalone /post/[id]
 * page. Fixed-region layout so the modal always has known dimensions:
 *   header · media · title  -> fixed height
 *   review                  -> flex-1, scrolls within the space that's left
 *   comments / action bar   -> CommentSection (the single like+comment bar)
 *
 * Reuses PostHeader / PostMedia / CommentSection so it stays in lockstep with the
 * feed. The post's own PostFooter (PostStats) is intentionally NOT rendered here —
 * CommentSection owns the one action bar, so there's no duplicate like/comment row.
 */
const PostModalContent = ({ post_media_data, user_id }: PostModalContentProps) => {
  const { post_data, media_data } = post_media_data ?? {};
  if (!post_data || !media_data) return null;

  const post = post_data.post;
  const seasonLabel =
    post.season_number == null
      ? 'Full Series'
      : post.season_number === 0
        ? 'Specials'
        : `Season ${post.season_number}`;

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      {/* Post column — fixed regions + a scrollable review */}
      <div className="flex min-h-0 flex-1 flex-col bg-white/10 md:w-[60%] md:flex-none">
        <div className="shrink-0">
          <PostHeader creator={post_data.creator} post={post} user_id={user_id} />
        </div>
        <div className="max-h-[40vh] shrink-0 overflow-hidden md:max-h-none">
          <PostMedia media={media_data} post={post} />
        </div>
        <div className="flex shrink-0 flex-row items-center gap-2 px-3 py-2">
          <img
            src={`/assets/icons/${media_data.media_type}-outline.svg`}
            alt=""
            className="invert-on-dark aspect-square h-5"
          />
          <Link
            href={`/protected/media/${media_data.media_type}/${media_data.media_id}`}
            className="line-clamp-1 font-medium"
          >
            {media_data.title || media_data.name}
            {media_data.media_type === 'tv' && (
              <span className="text-foreground/50">
                {' · '}
                {seasonLabel}
              </span>
            )}
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line px-3 pb-3 text-sm text-foreground/80">
          {post.review_user || 'No review'}
        </div>
      </div>

      {/* Comments column (desktop) / action bar + sheet (mobile) */}
      <div className="flex min-h-0 shrink-0 flex-col border-foreground/10 bg-white/10 md:w-[40%] md:flex-1 md:border-l">
        <CommentSection
          post_data={post_data}
          current_user={post_data.current_user ?? {}}
          lockBodyScroll={false}
        />
      </div>
    </div>
  );
};

export default PostModalContent;
