'use client';

import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '@/hooks/UserContext';
import { getCachedComments, setCachedComments } from '@/lib/client/commentCache';
import { getLikedCommentIds } from '@/lib/client/commentLikes';
import { likePost, removeLike } from '@/lib/client/updatePostData';
import { getCommentsByPostId, getRepliesByCommentId } from '@/lib/db/client-actions';
import AddComment from './AddCommentModal';
import CommentCard from './CommentCardModal';

const CommentsSkeleton = () => (
  <div className="relative flex w-full flex-col gap-4 overflow-hidden p-3">
    <div className="skeleton-shimmer z-10" />
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex w-full flex-row gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-foreground/10" />
        <div className="flex w-full flex-col gap-2">
          <div className="h-3 w-1/3 rounded bg-foreground/10" />
          <div className="h-3 w-2/3 rounded bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-1 py-10">
    <p className="text-base font-semibold">No comments yet</p>
    <p className="text-xs text-foreground/50">Start the conversation.</p>
  </div>
);

// Collect every comment id (top-level + nested replies) so we can load the
// current user's per-comment liked state in one query.
const collectCommentIds = (comments: any[] | undefined): string[] => {
  const ids: string[] = [];
  const walk = (list: any[] | undefined) =>
    list?.forEach((c) => {
      if (c?.id) ids.push(c.id);
      if (c?.replies?.length) walk(c.replies);
    });
  walk(comments);
  return ids;
};

const CommentSection = ({ post_data, current_user, lockBodyScroll = true }: any) => {
  const post = post_data.post;
  const comment_data = post_data.comments;
  const postId = post.id;
  const { user } = useUser();
  const user_id = user?.id != null ? String(user.id) : undefined;

  // Comments load lazily (first time shown) then stay cached so reopening a post
  // is instant. The feed never loads comments up front.
  const initialComments = comment_data ?? getCachedComments(postId);
  const [comments, setComments] = useState<any[] | undefined>(initialComments);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(initialComments === undefined);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [showSheet, setShowSheet] = useState(false);
  const [mounted, setMounted] = useState(false);
  const commentsLoadingRef = useRef(false);

  // Portal target only exists on the client.
  useEffect(() => setMounted(true), []);

  // Post-level like
  const [liked, setLiked] = useState<boolean>(!!current_user?.has_liked);
  const [likes, setLikes] = useState<number>(post.total_likes || 0);
  const [likeAnimate, setLikeAnimate] = useState(false);
  const commentCount = post.total_comments || 0;

  const dragControls = useDragControls();

  const ensureCommentsLoaded = useCallback(async () => {
    if (comments !== undefined || commentsLoadingRef.current) return;
    commentsLoadingRef.current = true;
    setCommentsLoading(true);
    try {
      const data = await getCommentsByPostId(String(postId), user_id ? String(user_id) : undefined);
      setCachedComments(postId, (data as any[]) ?? []);
      setComments((data as any[]) ?? []);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
      commentsLoadingRef.current = false;
    }
  }, [comments, postId, user_id]);

  // Desktop shows comments inline → load on mount. Mobile loads when the sheet opens.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      ensureCommentsLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showSheet) ensureCommentsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSheet]);

  // Load which comments the current user has liked whenever the set changes.
  useEffect(() => {
    const ids = collectCommentIds(comments);
    if (!ids.length || !user_id) return;
    let cancelled = false;
    getLikedCommentIds(String(user_id), ids).then((set) => {
      if (!cancelled) setLikedCommentIds(set);
    });
    return () => {
      cancelled = true;
    };
  }, [comments, user_id]);

  const fetchComments = useCallback(async () => {
    try {
      const data = await getCommentsByPostId(String(postId), String(user_id));
      setCachedComments(postId, (data as any[]) ?? []);
      setComments((data as any[]) ?? []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [postId, user_id]);

  const fetchReplies = useCallback(
    async (commentId: string) => {
      try {
        const replies = await getRepliesByCommentId(String(commentId), String(user_id));
        setComments((prev) =>
          (prev ?? []).map((c: any) =>
            c.id === commentId ? { ...c, replies: replies || [] } : c
          )
        );
      } catch (error) {
        console.error('Error fetching replies:', error);
      }
    },
    [user_id]
  );

  // Lock the page behind the mobile sheet (skipped inside the modal, which owns it).
  useEffect(() => {
    if (!lockBodyScroll) return;
    if (showSheet) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSheet, lockBodyScroll]);

  // Disable native pull-to-refresh ONLY while the sheet is open (so dragging it
  // down doesn't refresh the page), leaving pull-to-refresh working everywhere else.
  useEffect(() => {
    if (!showSheet) return;
    const html = document.documentElement;
    const prevHtml = html.style.overscrollBehaviorY;
    const prevBody = document.body.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = 'none';
    document.body.style.overscrollBehaviorY = 'none';
    return () => {
      html.style.overscrollBehaviorY = prevHtml;
      document.body.style.overscrollBehaviorY = prevBody;
    };
  }, [showSheet]);

  const handlePostLike = useCallback(async () => {
    if (!user_id) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    setLikeAnimate(true);
    setTimeout(() => setLikeAnimate(false), 300);
    try {
      if (next) await likePost(String(user_id), String(postId));
      else await removeLike(String(user_id), String(postId));
    } catch (error) {
      console.error('Error toggling like:', error);
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  }, [liked, user_id, postId]);

  const renderList = () => {
    if (commentsLoading && !comments) return <CommentsSkeleton />;
    const topLevel = (comments ?? []).filter((c: any) => c.parent_id === null);
    if (!topLevel.length) return <EmptyState />;
    return (
      <div className="flex w-full flex-col gap-4">
        {topLevel.map((comment: any) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            post={post}
            user_id={user_id}
            fetchComments={fetchComments}
            fetchReplies={fetchReplies}
            likedCommentIds={likedCommentIds}
          />
        ))}
      </div>
    );
  };

  const HeartButton = ({ size = 24 }: { size?: number }) => (
    <button onClick={handlePostLike} className={likeAnimate ? 'pop' : ''} aria-label="Like post">
      {liked ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 -960 960 960"
          width={size}
          height={size}
          className="fill-accent"
        >
          <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z" />
        </svg>
      ) : (
        <img
          src="/assets/icons/heart-outline.svg"
          alt=""
          width={size}
          height={size}
          className="invert-on-dark"
        />
      )}
    </button>
  );

  return (
    <div className="flex h-full w-full flex-col">
      {/* Desktop: inline comments column */}
      <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{renderList()}</div>
        <div className="flex items-center gap-2 border-t border-foreground/10 px-3 py-2">
          <HeartButton size={22} />
          <span className="text-sm font-semibold">{likes}</span>
        </div>
        <AddComment
          post={post}
          user_id={user_id}
          fetchComments={fetchComments}
          fetchReplies={fetchReplies}
        />
      </div>

      {/* Mobile: action bar (opens the sheet) */}
      <div className="flex w-full items-center gap-5 border-t border-foreground/10 p-3 md:hidden">
        <div className="flex items-center gap-2">
          <HeartButton />
          <span className="font-semibold">{likes}</span>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="flex items-center gap-2 text-foreground"
          aria-label="View comments"
        >
          <img
            src="/assets/icons/comment-outline.svg"
            alt=""
            width={24}
            height={24}
            className="invert-on-dark"
          />
          <span className="font-semibold">{commentCount}</span>
        </button>
      </div>

      {/* Mobile: Instagram-style bottom sheet with drag-to-dismiss.
          Portaled to <body> so the modal panel's transform doesn't trap the
          fixed positioning, and so the dim/sheet cover the whole screen. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {showSheet && (
              <div className="md:hidden">
            <motion.div
              key="dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowSheet(false)}
              className="fixed inset-0 z-40 bg-black/50"
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 320 }}
              drag="y"
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 120 || info.velocity.y > 600) setShowSheet(false);
              }}
              className="surface-elevated fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-[20px] text-foreground shadow-2xl"
            >
              {/* Grab handle + title — the only drag-initiating region, so the
                  comment list below still scrolls normally. */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
              >
                <div className="flex justify-center pt-2.5">
                  <div className="h-1.5 w-10 rounded-full bg-foreground/25" />
                </div>
                <div className="px-4 py-2 text-center text-sm font-semibold">Comments</div>
                <div className="h-px w-full bg-foreground/10" />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                {renderList()}
              </div>

              <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
                <AddComment
                  post={post}
                  user_id={user_id}
                  fetchComments={fetchComments}
                  fetchReplies={fetchReplies}
                />
              </div>
            </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default CommentSection;
