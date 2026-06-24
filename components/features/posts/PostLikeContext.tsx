'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { likePost, removeLike } from '@/lib/client/updatePostData';

interface PostLikeValue {
  liked: boolean;
  likes: number;
  /** Briefly true after a like change so the heart button can "pop". */
  animate: boolean;
  /** Toggle behaviour used by the like button (likes or unlikes). */
  toggleLike: () => void;
  /** Like-only behaviour used by double-tap. Never unlikes; safe to call repeatedly. */
  likeOnce: () => void;
}

const PostLikeContext = createContext<PostLikeValue | null>(null);

/**
 * Centralises the like state for a single post so the like button (PostStats) and
 * the double-tap-to-like gesture (DoubleTapLike) share one source of truth and stay
 * in sync. The optimistic-update logic mirrors the previous PostStats implementation.
 */
export function PostLikeProvider({
  postId,
  userId,
  initialLiked,
  initialLikes,
  children,
}: {
  postId: string;
  userId?: string;
  initialLiked: boolean;
  initialLikes: number;
  children: React.ReactNode;
}) {
  const [liked, setLiked] = useState<boolean>(!!initialLiked);
  const [likes, setLikes] = useState<number>(initialLikes || 0);
  const [animate, setAnimate] = useState(false);
  // Guards against overlapping network calls (e.g. mashing the button / double-tap).
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(t);
  }, [animate]);

  const toggleLike = useCallback(() => {
    if (!userId || pendingRef.current) return;
    const next = !liked;
    pendingRef.current = true;
    setLiked(next);
    setLikes((c) => (next ? c + 1 : c - 1));
    setAnimate(true);

    const run = next ? likePost(userId, postId) : removeLike(userId, postId);
    Promise.resolve(run)
      .then((res: any) => {
        if (res?.error) throw res.error;
      })
      .catch((error) => {
        // Revert on failure.
        setLiked(!next);
        setLikes((c) => (next ? c - 1 : c + 1));
        console.error('Error toggling like:', error);
      })
      .finally(() => {
        pendingRef.current = false;
      });
  }, [userId, postId, liked]);

  const likeOnce = useCallback(() => {
    // Already liked (or a request in flight) → keep it liked, just let the caller
    // play its heart animation again. Only the first like hits the network.
    if (!userId || liked || pendingRef.current) {
      setAnimate(true);
      return;
    }
    pendingRef.current = true;
    setLiked(true);
    setLikes((c) => c + 1);
    setAnimate(true);

    Promise.resolve(likePost(userId, postId))
      .then((res: any) => {
        if (res?.error) throw res.error;
      })
      .catch((error) => {
        setLiked(false);
        setLikes((c) => c - 1);
        console.error('Error liking post:', error);
      })
      .finally(() => {
        pendingRef.current = false;
      });
  }, [userId, postId, liked]);

  return (
    <PostLikeContext.Provider value={{ liked, likes, animate, toggleLike, likeOnce }}>
      {children}
    </PostLikeContext.Provider>
  );
}

/** Returns the shared like state, or null when used outside a provider. */
export function usePostLike(): PostLikeValue | null {
  return useContext(PostLikeContext);
}
