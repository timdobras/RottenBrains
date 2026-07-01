'use client';
import { Heart } from 'lucide-react';
import Image from 'next/image';
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
  onCommentAdded?: (total: number) => void;
  likedCommentIds?: Set<string>;
  isReply?: boolean;
}

const CommentCard = ({
  comment,
  post,
  user_id,
  fetchComments,
  fetchReplies,
  onCommentAdded,
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
      <Image
        src={creator.image_url || '/assets/images/logo_new_black.svg'}
        alt=""
        width={32}
        height={32}
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
              onCommentAdded={onCommentAdded}
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
                    onCommentAdded={onCommentAdded}
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
        <Heart className={`h-4 w-4 ${liked ? 'fill-accent text-accent' : ''}`} />
      </button>
    </div>
  );
};

export default CommentCard;
