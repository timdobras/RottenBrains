'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { toggleCommentLike } from '@/lib/client/commentLikes';
import { getRelativeTime } from '@/lib/utils';
import AddComment from './AddCommentModal';

interface CommentCardProps {
  comment: any;
  post: any;
  user_id?: string;
  fetchComments?: () => Promise<void> | void;
  fetchReplies?: (parentId: string) => Promise<void> | void;
  likedCommentIds?: Set<string>;
  isReply?: boolean;
}

const CommentCard = ({
  comment,
  post,
  user_id,
  fetchComments,
  fetchReplies,
  likedCommentIds,
  isReply,
}: CommentCardProps) => {
  const creator = comment.commenter;
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<any[]>(comment.replies || []);
  const [liked, setLiked] = useState<boolean>(!!likedCommentIds?.has(comment.id));
  const [likes, setLikes] = useState<number>(comment.total_likes || 0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setReplies(comment.replies || []);
  }, [comment.replies]);

  useEffect(() => {
    setLiked(!!likedCommentIds?.has(comment.id));
  }, [likedCommentIds, comment.id]);

  if (!creator) return null;

  const handleLike = async () => {
    if (!user_id) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    setAnimate(true);
    setTimeout(() => setAnimate(false), 300);
    try {
      await toggleCommentLike(user_id, comment.id, next);
    } catch {
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  };

  const replyCount = replies?.length || 0;

  return (
    <div className="flex w-full gap-2">
      <img
        src={creator.image_url}
        alt=""
        className="aspect-square h-8 shrink-0 rounded-full bg-foreground/10 object-cover"
      />
      <div className="flex w-full flex-col gap-1">
        <p className="text-sm leading-snug">
          <Link href={`/protected/user/${creator.id}`} className="mr-1 font-semibold">
            {creator.username}
          </Link>
          {comment.content}
        </p>
        <div className="flex flex-row items-center gap-3 text-xs text-foreground/50">
          <span>{getRelativeTime(comment.created_at)}</span>
          {likes > 0 && (
            <span>
              {likes} {likes === 1 ? 'like' : 'likes'}
            </span>
          )}
          {!isReply && (
            <button onClick={() => setShowReplyInput((s) => !s)} className="font-semibold">
              Reply
            </button>
          )}
        </div>

        {showReplyInput && (
          <div className="pt-1">
            <AddComment
              post={post}
              user_id={user_id}
              fetchComments={fetchComments}
              fetchReplies={fetchReplies}
              parent_id={comment.id}
              autoFocus
              placeholder={`Reply to ${creator.username}…`}
            />
          </div>
        )}

        {replyCount > 0 && (
          <div className="mt-1 flex flex-col gap-3">
            <button
              onClick={() => setShowReplies((s) => !s)}
              className="flex items-center gap-2 text-xs font-semibold text-foreground/50"
            >
              <span className="h-px w-6 bg-foreground/20" />
              {showReplies ? 'Hide replies' : `View replies (${replyCount})`}
            </button>
            {showReplies && (
              <div className="flex flex-col gap-3">
                {replies.map((reply: any) => (
                  <CommentCard
                    key={reply.id}
                    comment={reply}
                    post={post}
                    user_id={user_id}
                    fetchComments={fetchComments}
                    fetchReplies={fetchReplies}
                    likedCommentIds={likedCommentIds}
                    isReply
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleLike}
        aria-label={liked ? 'Unlike comment' : 'Like comment'}
        className={`shrink-0 self-start pt-1 ${animate ? 'pop' : ''}`}
      >
        {liked ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 -960 960 960"
            className="h-4 w-4 fill-accent"
          >
            <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z" />
          </svg>
        ) : (
          <img
            src="/assets/icons/heart-outline.svg"
            alt=""
            className="invert-on-dark h-4 w-4"
          />
        )}
      </button>
    </div>
  );
};

export default CommentCard;
