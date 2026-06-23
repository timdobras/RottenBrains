'use client';

import { useEffect } from 'react';
import { seedPostData } from '@/lib/client/postModalStore';

/**
 * Drop-in inside a post card to publish its already-loaded `post_media_data` into
 * the in-memory store, so opening the post modal reuses it instead of refetching.
 */
export default function SeedPostData({ id, data }: { id: string | number; data: any }) {
  useEffect(() => {
    seedPostData(id, data);
  }, [id, data]);
  return null;
}
