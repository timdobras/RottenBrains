'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@/hooks/UserContext';
import { getCachedComments, setCachedComments } from '@/lib/client/commentCache';
import { likePost, removeLike } from '@/lib/client/updatePostData';
import { getCommentsByPostId, getRepliesByCommentId } from '@/lib/supabase/serverQueries';
import AddComment from './AddCommentModal';
import CommentCard from './CommentCardModal';

const cardVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { duration: 0.2 } },
  exit: { y: '100%', transition: { duration: 0.3 } },
};

const CommentsSkeleton = () => (
  <div className="flex w-full flex-col gap-3 p-2">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex w-full animate-pulse flex-row gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-foreground/10" />
        <div className="flex w-full flex-col gap-2">
          <div className="h-3 w-1/3 rounded bg-foreground/10" />
          <div className="h-3 w-2/3 rounded bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);

const CommentSection = ({ post_data, current_user }: any) => {
  const post = post_data.post;
  const comment_data = post_data.comments;
  const postId = post.id;
  const { user } = useUser();
  const user_id = user?.id;
  // Comments are NOT loaded when a post arrives in a feed; they load lazily the
  // first time this post's comments are shown, then stay cached (commentCache)
  // so reopening the same post is instant and refetch-free.
  const initialComments = comment_data ?? getCachedComments(postId);
  const [state, setState] = useState({
    liked: current_user.has_liked,
    likes: post.total_likes,
    animate: false,
    isOpen: false,
    comments: initialComments,
    commentCount: post.total_comments || 0,
    loading: false,
    commentsLoading: initialComments === undefined,
    show_comments: false,
  });
  const commentsLoadingRef = useRef(false);

  // Loads comments once (if not already present/in-flight) and caches them.
  const ensureCommentsLoaded = useCallback(async () => {
    if (state.comments !== undefined || commentsLoadingRef.current) return;
    commentsLoadingRef.current = true;
    setState((s) => ({ ...s, commentsLoading: true }));
    try {
      const comments = await getCommentsByPostId(
        String(postId),
        user_id ? String(user_id) : undefined
      );
      setCachedComments(postId, (comments as any[]) ?? []);
      setState((s) => ({ ...s, comments: comments ?? [], commentsLoading: false }));
    } catch (error) {
      console.error('Error loading comments:', error);
      setState((s) => ({ ...s, comments: [], commentsLoading: false }));
    } finally {
      commentsLoadingRef.current = false;
    }
  }, [state.comments, postId, user_id]);

  // Desktop shows the comments column inline → load as soon as it mounts.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      ensureCommentsLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mobile keeps comments behind a sheet → load when it's opened.
  useEffect(() => {
    if (state.show_comments) ensureCommentsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.show_comments]);

  const [viewportDimensions, setViewportDimensions] = useState({
    top: 40,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const fetchComments = async () => {
    try {
      const comments = await getCommentsByPostId(String(postId), String(user_id));
      setCachedComments(postId, (comments as any[]) ?? []);
      setState((prevState) => ({
        ...prevState,
        comments,
        loading: false,
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      setState((prevState) => ({
        ...prevState,
        loading: false,
      }));
    }
  };

  const fetchReplies = async (commentId: string) => {
    try {
      const replies = await getRepliesByCommentId(String(commentId), String(user_id));

      setState((prevState) => {
        const updatedComments = prevState.comments.map((comment: any) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: replies || [], // Ensuring a new array reference
            };
          }
          return comment;
        });

        return {
          ...prevState,
          comments: [...updatedComments], // Ensure a new reference for the array
        };
      });
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  useEffect(() => {
    if (!state.show_comments) return;

    const handleViewportChange = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        setViewportDimensions({
          top: 80,
          height: visualViewport.height - 80,
        });
      }
    };

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', handleViewportChange);
      viewport.addEventListener('scroll', handleViewportChange);
      handleViewportChange(); // Initial calculation
    }
    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', handleViewportChange);
        viewport.removeEventListener('scroll', handleViewportChange);
      }
      // Unlock body scroll
      document.body.classList.remove('overflow-hidden');
    };
  }, [state.show_comments]);

  useEffect(() => {
    if (state.show_comments) {
      document.documentElement.style.overflow = 'hidden'; // Prevent scrolling
      document.documentElement.style.position = 'fixed'; // Keep position fixed
      document.documentElement.style.width = '100%'; // Ensure full width
      document.body.style.overflow = 'hidden'; // Prevent scrolling
      document.body.style.position = 'fixed'; // Prevent body scroll
      document.body.style.width = '100%';
    } else {
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, [state.show_comments]);

  // This function is used for the like button
  const handleLike = useCallback(async () => {
    if (user_id) {
      const newLikedState = !state.liked;
      const newLikesCount = newLikedState ? state.likes + 1 : state.likes - 1;

      setState((prevState) => ({
        ...prevState,
        liked: newLikedState,
        likes: newLikesCount,
        animate: true,
      }));

      try {
        if (newLikedState) {
          await likePost(String(user_id), String(postId));
        } else {
          await removeLike(String(user_id), String(postId));
        }
      } catch (error) {
        setState((prevState) => ({
          ...prevState,
          liked: !newLikedState,
          likes: state.likes,
          animate: false,
        }));
        console.error('Error toggling like:', error);
      }
    }
  }, [state.liked, state.likes, user_id, postId]);

  if (state.loading) {
    return <div>loading</div>;
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Desktop Comments Section */}
      <div
        id="comment_card_desktop"
        className="hidden h-full w-full flex-col gap-2 overflow-y-auto md:flex"
      >
        {state.commentsLoading && !state.comments ? (
          <CommentsSkeleton />
        ) : state.comments && state.comments.length > 0 ? (
          <>
            {state.comments.map((comment: any) => {
              if (comment.parent_id === null) {
                return (
                  <div key={comment.id} className="w-full">
                    <CommentCard
                      comment={comment}
                      post={post}
                      user_id={user_id}
                      fetchComments={fetchComments}
                      fetchReplies={fetchReplies}
                    />
                  </div>
                );
              }
              return null;
            })}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <p className="text-lg font-medium">No comments yet</p>
            <p className="text-xs text-foreground/50">Start the conversation.</p>
          </div>
        )}
      </div>

      <div className="w-full">
        <div className="flex w-full flex-row items-center gap-4 border-t border-foreground/10 bg-background p-4 md:p-2">
          <div className="flex flex-row gap-2">
            <button onClick={handleLike} className={state.animate ? 'pop' : ''}>
              {state.liked ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="0000000"
                  className={`heart-icon ${state.animate ? 'pop' : ''} fill-accent`}
                >
                  <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z" />
                </svg>
              ) : (
                <img
                  src={'/assets/icons/heart-outline.svg'}
                  alt="Not Liked"
                  width="24px"
                  height="24px"
                  className={`heart-icon invert-on-dark ${state.animate ? 'pop' : ''}`}
                />
              )}
            </button>
            <p className="font-bold">{state.likes}</p>
          </div>
          <div className="flex flex-row gap-2 md:hidden">
            <button
              onClick={() =>
                setState((prevState) => ({
                  ...prevState,
                  show_comments: true,
                }))
              }
              className="text-foreground"
            >
              <img
                src="/assets/icons/comment-outline.svg"
                alt="Comment"
                width={24}
                height={24}
                className="invert-on-dark max-h-[24px] min-h-[24px] min-w-[24px] max-w-[24px]"
              />
            </button>
            <p className="font-bold">{state.commentCount}</p>
          </div>
        </div>
        {/* Desktop comment input */}
        <div className="hidden w-full md:flex">
          <AddComment
            post={post}
            user_id={user_id}
            fetchComments={fetchComments}
            fetchReplies={fetchReplies}
          />
        </div>
        {/* Mobile Comments Modal */}
        <AnimatePresence>
          {state.show_comments && (
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed left-0 z-50 flex w-full flex-col rounded-[16px] bg-background text-foreground"
              style={{
                top: `${viewportDimensions.top}px`,
                height: `${viewportDimensions.height}px`,
              }}
            >
              <div className="flex w-full flex-row items-center justify-between border-b border-foreground/20">
                <h2 className="p-4 text-lg font-semibold">Comments</h2>
                <button
                  className="aspect-square h-12 text-2xl font-medium text-foreground"
                  onClick={() =>
                    setState((prevState) => ({
                      ...prevState,
                      show_comments: false,
                    }))
                  }
                >
                  <p>&times;</p>
                </button>
              </div>
              {state.commentsLoading && !state.comments ? (
                <div className="h-full w-full overflow-y-auto">
                  <CommentsSkeleton />
                </div>
              ) : state.comments && state.comments.length > 0 ? (
                <div className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2">
                  {state.comments.map((comment: any) => {
                    if (comment.parent_id === null) {
                      return (
                        <div key={comment.id} className="w-full">
                          <CommentCard
                            comment={comment}
                            post={post}
                            user_id={user_id}
                            fetchComments={fetchComments}
                            fetchReplies={fetchReplies}
                          />
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <p className="text-lg font-medium">No comments yet</p>
                  <p className="text-xs text-foreground/50">Start the conversation.</p>
                </div>
              )}
              <div className="w-full">
                <AddComment
                  post={post}
                  user_id={user_id}
                  fetchComments={fetchComments}
                  fetchReplies={fetchReplies}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CommentSection;
