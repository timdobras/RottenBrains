import React from 'react';

const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`rounded bg-foreground/10 ${className}`} />
);

/**
 * Placeholder shaped like the post modal (PostModalContent) — same regions and
 * proportions, no images/text, with a soft pulse. Shown while the modal route
 * resolves (loading.tsx) and during a cold comment/post fetch, so opening reads
 * as "loading this exact thing" rather than a generic spinner.
 */
const PostModalSkeleton = () => (
  <div className="flex h-full w-full animate-pulse flex-col md:flex-row">
    {/* Post column */}
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-white/10 p-3 md:w-[60%] md:flex-none">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-foreground/10" />
        <div className="flex flex-col gap-1">
          <Bar className="h-3 w-24" />
          <Bar className="h-2 w-16" />
        </div>
      </div>
      <Bar className="aspect-video w-full" />
      <Bar className="h-4 w-1/2" />
      <div className="flex flex-col gap-2">
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-11/12" />
        <Bar className="h-3 w-4/5" />
      </div>
    </div>
    {/* Comments column (desktop) */}
    <div className="hidden min-h-0 flex-1 flex-col gap-3 border-l border-foreground/10 p-3 md:flex md:w-[40%]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-2">
          <div className="h-8 w-8 rounded-full bg-foreground/10" />
          <div className="flex w-full flex-col gap-2">
            <Bar className="h-3 w-1/3" />
            <Bar className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default PostModalSkeleton;
