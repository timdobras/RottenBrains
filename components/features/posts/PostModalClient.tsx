'use client';

import { Dialog } from '@base-ui/react/dialog';
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
 * Built on Base UI's Dialog: it provides the focus trap, scroll lock, Escape
 * and outside-press handling. Closing flips `open` to false, Base UI plays the
 * exit animation, then `onOpenChangeComplete` runs router.back() — so the modal
 * animates out smoothly instead of vanishing on navigation.
 */
const PostModalClient = ({ postId }: { postId: string }) => {
  const router = useRouter();
  const { user } = useUser();

  const seeded = getSeededPostData(postId);
  const [postMediaData, setPostMediaData] = useState<any>(seeded ?? null);
  const [loading, setLoading] = useState<boolean>(!seeded);
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

  return (
    <Dialog.Root
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        // Navigate back only after the exit animation has finished.
        if (!isOpen) router.back();
      }}
    >
      <Dialog.Portal>
        {/* Starts already blurred so it hands off seamlessly from loading.tsx
            (which keyframes the blur in). Only the exit is animated here. */}
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[6px] transition-[opacity,backdrop-filter] duration-200 data-[ending-style]:opacity-0 data-[ending-style]:backdrop-blur-none" />
        {/* No enter animation: the zoom-in already played on loading.tsx, so the
            real panel just replaces the skeleton in place. Only the exit animates. */}
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 h-[80vh] max-h-[90vh] w-full max-w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] bg-background text-foreground shadow-lg outline-none transition duration-200 data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 md:aspect-[16/9] md:h-auto md:max-h-[90vh] md:w-[60vw]">
          <Dialog.Title className="sr-only">Post</Dialog.Title>
          <Dialog.Close
            aria-label="Close"
            className="absolute right-2 top-2 z-10 flex aspect-square h-8 items-center justify-center rounded-full bg-background/60 text-lg font-semibold backdrop-blur-sm"
          >
            <p>&times;</p>
          </Dialog.Close>
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
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default PostModalClient;
