export default function SearchLoading() {
  return (
    <div className="flex w-full flex-col gap-4 px-4 md:px-0">
      <div className="h-10 w-full animate-pulse rounded-full bg-foreground/10" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-video w-full animate-pulse rounded-[8px] bg-foreground/10" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
