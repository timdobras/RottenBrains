'use client';

import { motion } from 'framer-motion';
import PostModalSkeleton from '@/components/features/posts/PostModalSkeleton';

// Instant feedback for the intercepting post modal: the moment a post link is
// clicked, Next shows this while the route's RSC resolves. It keyframes the blur
// backdrop in and shows a post-shaped skeleton at the modal's real dimensions, so
// opening feels immediate and stable. PostModalClient's backdrop starts already
// blurred, so the hand-off to the real modal is seamless.
export default function PostModalLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2"
    >
      <div className="relative h-[80vh] max-h-[90vh] w-full max-w-[95vw] overflow-hidden rounded-[16px] bg-background shadow-lg md:aspect-[16/9] md:h-auto md:w-[60vw]">
        <PostModalSkeleton />
      </div>
    </motion.div>
  );
}
