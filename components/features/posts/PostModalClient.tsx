'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/hooks/UserContext';
import { fetchPostByIdClient } from '@/lib/client/fetchPostByIdClient';
import { getSeededPostData } from '@/lib/client/postModalStore';
import PostDetailView from './PostDetailView';

/**
 * Client modal rendered by the intercepting route app/protected/@modal/(.)post/[post_id].
 *
 * Opening is instant when the post card seeded its data into `postModalStore`
 * (no network round-trip — we reuse the post + media data already in memory).
 * For cold soft-navigations with no seed, it falls back to a client fetch.
 *
 * Because the intercept only renders on a soft navigation, there is always history
 * to return to, so closing == router.back().
 */
const PostModalClient = ({ postId }: { postId: string }) => {
  const router = useRouter();
  const { user } = useUser();

  const seeded = getSeededPostData(postId);
  const [postMediaData, setPostMediaData] = useState<any>(seeded ?? null);
  const [loading, setLoading] = useState<boolean>(!seeded);

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

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.back();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [router]);

  const handleClose = () => router.back();

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-2 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-[95vw] overflow-hidden rounded-[16px] bg-background text-foreground shadow-lg md:aspect-[16/9] md:max-h-[90vh] md:w-[60vw]"
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 flex aspect-square h-8 items-center justify-center text-lg font-semibold"
        >
          <p>&times;</p>
        </button>
        <div className="h-full w-full overflow-y-auto">
          {loading && !postMediaData ? (
            <div className="flex h-full min-h-[300px] items-center justify-center">
              <span className="opacity-50">Loading…</span>
            </div>
          ) : postMediaData ? (
            <PostDetailView
              post_media_data={postMediaData}
              current_user_id={user?.id != null ? String(user.id) : undefined}
            />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center">
              <span className="opacity-50">Post not found.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostModalClient;
