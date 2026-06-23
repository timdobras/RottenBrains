'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import ProfilePicture from '@/components/ui/ProfilePicture';
import { getImageUrlFromMediaDetails } from '@/lib/server/helperFunctions';
import { getCommentsByPostId } from '@/lib/supabase/serverQueries';
import { getRelativeTime } from '@/lib/utils';
import ImageWithFallback from '../media/ImageWithFallback';
import CommentSection from '../profile/CommentSection';

interface PostDetailViewProps {
  post_media_data: any;
  current_user_id?: string;
}

/**
 * Shared post body used by both the intercepting post modal and the standalone
 * /protected/post/[post_id] page. Renders the creator header, media image, review
 * text and comments.
 *
 * Comments arrive one of two ways:
 *  - a cold fetch (getPostByIdNew / fetchPostById) already embeds `post_data.comments`
 *  - the in-memory card hand-off does NOT include comments, so we lazily load them here
 */
const PostDetailView = ({ post_media_data, current_user_id }: PostDetailViewProps) => {
  const { post_data, media_data } = post_media_data ?? {};
  const postId = post_data?.post?.id;
  const seededComments = post_data?.comments;

  const [comments, setComments] = useState<any[] | undefined>(seededComments);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(seededComments === undefined);

  useEffect(() => {
    if (seededComments !== undefined) {
      setComments(seededComments);
      setCommentsLoading(false);
      return;
    }
    if (!postId) return;

    let cancelled = false;
    setCommentsLoading(true);
    getCommentsByPostId(String(postId), current_user_id ? String(current_user_id) : undefined)
      .then((data) => {
        if (cancelled) return;
        setComments((data as any[]) ?? []);
        setCommentsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setComments([]);
        setCommentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId, seededComments, current_user_id]);

  if (!post_data || !media_data) return null;

  const postWithComments = { ...post_data, comments: comments ?? [] };

  return (
    <div className="flex h-full w-full flex-col md:flex-row md:gap-2">
      <div className="flex h-full flex-col bg-background md:w-[60%]">
        <div className="h-full w-full">
          <div className="flex flex-row items-center justify-between gap-4 px-4 py-2">
            <div className="flex flex-row items-center gap-2">
              <span className="min-h-[32px] min-w-[32px]">
                <ProfilePicture user={post_data.creator} />
              </span>
              <div className="flex flex-col">
                <p className="line-clamp-1 font-bold text-accent/80">
                  <Link href={`/protected/user/${post_data.creator.id}`}>
                    {post_data.creator.username}
                  </Link>
                </p>
                <p className="-mt-1 text-xs opacity-50">
                  {getRelativeTime(post_data.post.created_at)}
                </p>
              </div>
            </div>
          </div>
          <div className="relative w-full">
            <Link
              href={`/protected/media/${media_data.media_type}/${media_data.media_id}`}
              className="w-full"
            >
              <ImageWithFallback
                imageUrl={post_data.post.image_path || getImageUrlFromMediaDetails(media_data)}
                altText={post_data.post.post_id}
                quality={'original'}
              />
            </Link>
            <div className="absolute bottom-2 right-2">
              <p className="rounded-[4px] bg-secondary px-2 py-1 text-xs text-white">
                {post_data.post.vote_user}
              </p>
            </div>
          </div>
          <div className="flex flex-col px-2 md:px-4">
            <div className="flex flex-col gap-2 py-4">
              <div className="flex w-full flex-row gap-2">
                <img
                  src={`/assets/icons/${media_data.media_type}-outline.svg`}
                  alt=""
                  className="invert-on-dark"
                />
                <Link
                  href={`/protected/media/${media_data.media_type}/${media_data.media_id}`}
                  className="line-clamp-1 font-medium"
                >
                  {media_data && (media_data.title || media_data.name)}
                  {media_data.media_type === 'tv' && (
                    <span className="text-foreground/50">
                      {' · '}
                      {post_data.post.season_number == null
                        ? 'Full Series'
                        : post_data.post.season_number === 0
                          ? 'Specials'
                          : `Season ${post_data.post.season_number}`}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="h-full max-h-[150px] w-full overflow-y-auto px-2 md:max-h-none md:px-4 md:pb-4">
          <p className="">{post_data.post.review_user}</p>
        </div>
      </div>
      <div className="mt-2 md:mt-8 md:w-[40%] md:p-2">
        {commentsLoading ? (
          <div className="p-4 text-sm opacity-50">Loading comments…</div>
        ) : (
          <CommentSection post_data={postWithComments} current_user={post_data.current_user ?? {}} />
        )}
      </div>
    </div>
  );
};

export default PostDetailView;
