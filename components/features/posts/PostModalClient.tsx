'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/hooks/UserContext';
import { fetchPostByIdClient } from '@/lib/client/fetchPostByIdClient';
import { getSeededPostData } from '@/lib/client/postModalStore';
import PostModalContent from './PostModalContent';
import PostModalSkeleton from './PostModalSkeleton';

/**
 * Client modal rendered by the intercepting route app/@modal/(.)post/[post_id].
 *
 * Opening is instant when the post card seeded its data into `postModalStore`
 * (no network round-trip — we reuse the post + media data already in memory).
 * For cold soft-navigations with no seed, it falls back to a client fetch.
 *
 * Closing plays an exit animation first, then router.back() once it completes —
 * so the modal animates out smoothly instead of vanishing on navigation.
 */
const PostModalClient = ({ postId }: { postId: string }) => {
  const router = useRouter();
  const { user } = useUser();

  const seeded = getSeededPostData(postId);
  const [postMediaData, setPostMediaData] = useState<any>(seeded ?? null);
  const [loading, setLoading] = useState<boolean>(!seeded);
  // Drives the enter/exit animation; flipping to false triggers the exit, and
  // onExitComplete performs the actual navigation back.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (postMediaData) return;

    let cancelled = false;
    setLoading(true);
    fetchPostByIdClient(String(postId), user?.id ? String(user.id) : undefined).then((data) => {
      if (cancelled) return;
      setPostMediaData(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.id]);

  const handleClose = () => setOpen(false);

  useEffect(() => {
    // Position-preserving scroll lock: pin the background where it is (instead of
    // letting it jump to top) and restore the exact scroll position on close.
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <AnimatePresence onExitComplete={() => router.back()}>
      {open && (
        <motion.div
          key="backdrop"
          onClick={handleClose}
          // Starts already blurred so it hands off seamlessly from loading.tsx
          // (which keyframes the blur in). Only the exit is animated here.
          initial={{ opacity: 1, backdropFilter: 'blur(6px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            // No enter animation: the zoom-in already played on loading.tsx, so the
            // real panel just replaces the skeleton in place. Only the exit animates.
            initial={{ opacity: 1, scale: 1, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative h-[80vh] max-h-[90vh] w-full max-w-[95vw] overflow-hidden rounded-[16px] bg-background text-foreground shadow-lg md:aspect-[16/9] md:h-auto md:max-h-[90vh] md:w-[60vw]"
          >
            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-2 top-2 z-10 flex aspect-square h-8 items-center justify-center rounded-full bg-background/60 text-lg font-semibold backdrop-blur-sm"
            >
              <p>&times;</p>
            </button>
            <div className="h-full w-full overflow-hidden">
              {loading && !postMediaData ? (
                <PostModalSkeleton />
              ) : postMediaData ? (
                <PostModalContent
                  post_media_data={postMediaData}
                  user_id={user?.id != null ? String(user.id) : undefined}
                />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center">
                  <span className="opacity-50">Post not found.</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostModalClient;
