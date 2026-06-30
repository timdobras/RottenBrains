'use client';

import { Drawer } from '@base-ui/react/drawer';
import { Drawer as VaulDrawer } from 'vaul';
import { Heart, MessageCircle } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@/hooks/UserContext';
import { getCachedComments, setCachedComments } from '@/lib/client/commentCache';
import { getLikedCommentIds } from '@/lib/client/commentLikes';
import { likePost, removeLike } from '@/lib/client/updatePostData';
import { getCommentsByPostId, getRepliesByCommentId } from '@/lib/db/client-actions';
import AddComment from './AddCommentModal';
import CommentCard from './CommentCardModal';

// A/B trial: which library powers the mobile comment sheet.
// 'vaul'   → Vaul (testing whether it feels smoother than Base UI)
// 'baseui' → the original @base-ui/react drawer
// Flip this one constant (and redeploy) to switch back.
const MOBILE_SHEET: 'vaul' | 'baseui' = 'vaul';

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

// Post-level like button (module scope so it isn't recreated each render).
const HeartButton = ({
  size = 24,
  liked,
  animate,
  onClick,
}: {
  size?: number;
  liked: boolean;
  animate: boolean;
  onClick: () => void;
}) => (
  <button onClick={onClick} className={animate ? 'pop' : ''} aria-label="Like post">
    <Heart size={size} className={liked ? 'fill-current text-accent' : ''} />
  </button>
);

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
  const commentsLoadingRef = useRef(false);

  // Post-level like
  const [liked, setLiked] = useState<boolean>(!!current_user?.has_liked);
  const [likes, setLikes] = useState<number>(post.total_likes || 0);
  const [likeAnimate, setLikeAnimate] = useState(false);
  const commentCount = post.total_comments || 0;

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

  // Scroll lock, focus trapping and swipe-to-dismiss are handled by Base UI's Drawer.

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

  return (
    <div className="flex h-full w-full flex-col">
      {/* Desktop: inline comments column */}
      <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{renderList()}</div>
        <div className="flex items-center gap-2 border-t border-foreground/10 px-3 py-2">
          <HeartButton
            size={22}
            liked={liked}
            animate={likeAnimate}
            onClick={handlePostLike}
          />
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
          <HeartButton liked={liked} animate={likeAnimate} onClick={handlePostLike} />
          <span className="font-semibold">{likes}</span>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="flex items-center gap-2 text-foreground"
          aria-label="View comments"
        >
          <MessageCircle size={24} />
          <span className="font-semibold">{commentCount}</span>
        </button>
      </div>

      {/* Mobile: Instagram-style bottom sheet with native swipe-to-dismiss.
          Shared inner content; only the drawer library differs (see MOBILE_SHEET). */}
      {(() => {
        const grabHandle = (
          <div className="flex justify-center pt-2.5">
            <div className="h-1.5 w-10 rounded-full bg-foreground/25" />
          </div>
        );
        const list = (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            {renderList()}
          </div>
        );
        const composer = (
          <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
            <AddComment
              post={post}
              user_id={user_id}
              fetchComments={fetchComments}
              fetchReplies={fetchReplies}
            />
          </div>
        );

        if (MOBILE_SHEET === 'vaul') {
          return (
            <VaulDrawer.Root
              open={showSheet}
              onOpenChange={setShowSheet}
              modal={!!lockBodyScroll}
            >
              <VaulDrawer.Portal>
                <VaulDrawer.Overlay className="fixed inset-0 z-40 bg-black/50 md:hidden" />
                <VaulDrawer.Content className="surface-elevated fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-[20px] text-foreground shadow-2xl outline-none md:hidden">
                  <div className="shrink-0 select-none">
                    {grabHandle}
                    <VaulDrawer.Title className="px-4 py-2 text-center text-sm font-semibold">
                      Comments
                    </VaulDrawer.Title>
                    <div className="h-px w-full bg-foreground/10" />
                  </div>
                  {list}
                  {composer}
                </VaulDrawer.Content>
              </VaulDrawer.Portal>
            </VaulDrawer.Root>
          );
        }

        return (
          <Drawer.Root
            open={showSheet}
            onOpenChange={setShowSheet}
            swipeDirection="down"
            modal={lockBodyScroll ? true : 'trap-focus'}
          >
            <Drawer.Portal>
              <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 md:hidden" />
              <Drawer.Popup className="surface-elevated fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-[20px] text-foreground shadow-2xl outline-none transition-transform duration-300 data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full md:hidden">
                <div className="shrink-0 select-none">
                  {grabHandle}
                  <Drawer.Title className="px-4 py-2 text-center text-sm font-semibold">
                    Comments
                  </Drawer.Title>
                  <div className="h-px w-full bg-foreground/10" />
                </div>
                {list}
                {composer}
              </Drawer.Popup>
            </Drawer.Portal>
          </Drawer.Root>
        );
      })()}
    </div>
  );
};

export default CommentSection;
