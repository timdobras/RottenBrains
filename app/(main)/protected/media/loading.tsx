export default function MediaLoading() {
  return (
    <div className="flex w-full flex-col gap-4 px-2">
      <div className="h-8 w-1/3 animate-pulse rounded bg-foreground/10" />
      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <div className="aspect-[2/3] w-full max-w-[300px] animate-pulse rounded-[4px] bg-foreground/10" />
        <div className="aspect-video w-full animate-pulse rounded-[4px] bg-foreground/10" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-full animate-pulse rounded bg-foreground/10" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/10" />
      </div>
    </div>
  );
}
