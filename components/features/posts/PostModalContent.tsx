import React from 'react';
import CommentSection from '../profile/CommentSection';
import HomePostCardUI from './HomePostCardUI';

interface PostModalContentProps {
  post_media_data: any;
  // Current user's id — required so PostStats (like/comment counts) renders.
  user_id?: string;
}

/**
 * Shared post body for the intercepting post modal AND the standalone /post/[id]
 * page. Reuses the exact feed card (HomePostCardUI) for the post — so the colors
 * and layout match the feed 1:1 — in its `expanded` form, alongside the comments.
 */
const PostModalContent = ({ post_media_data, user_id }: PostModalContentProps) => {
  const { post_data } = post_media_data ?? {};
  if (!post_data) return null;

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      <div className="md:w-[60%] md:overflow-y-auto">
        <HomePostCardUI
          post_media_data={post_media_data}
          user_id={user_id}
          variant="feed"
          rounded={false}
          expanded
          seed={false}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col border-foreground/10 md:w-[40%] md:border-l">
        <CommentSection post_data={post_data} current_user={post_data.current_user ?? {}} />
      </div>
    </div>
  );
};

export default PostModalContent;
