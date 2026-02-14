export default function WatchLoading() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="aspect-video w-full animate-pulse rounded-[8px] bg-foreground/10" />
      <div className="flex flex-col gap-2 px-4 md:px-0">
        <div className="h-6 w-1/3 animate-pulse rounded bg-foreground/10" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-foreground/10" />
      </div>
    </div>
  );
}
