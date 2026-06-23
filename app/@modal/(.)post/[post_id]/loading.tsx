'use client';

import { motion } from 'framer-motion';

// Instant feedback for the intercepting post modal: the moment a post link is
// clicked, Next shows this while the route's RSC resolves. It keyframes the blur
// backdrop in and shows a spinner, so opening feels immediate. PostModalClient's
// backdrop starts already-blurred, so the hand-off to the real modal is seamless.
export default function PostModalLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/80" />
    </motion.div>
  );
}
