interface MediaRowSkeletonProps {
  title: string;
}

/** Streaming placeholder for a MediaRow while its detail calls resolve. Mirrors
 *  MediaRow's spacing so nothing shifts when the real row swaps in. */
export default function MediaRowSkeleton({ title }: MediaRowSkeletonProps) {
  return (
    <section className="w-full min-w-0">
      <h2 className="mb-4 pl-4 text-lg font-semibold sm:text-xl md:pl-8">{title}</h2>
      <div className="-my-4 flex gap-4 overflow-hidden py-4 md:pl-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-[70vw] shrink-0 md:w-[300px]"
            aria-hidden
          >
            <div className="aspect-[16/9] w-full animate-pulse rounded-[8px] bg-foreground/10" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-foreground/10" />
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-foreground/10" />
          </div>
        ))}
      </div>
    </section>
  );
}
