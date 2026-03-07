export default function NotificationsLoading() {
  return (
    <div className="flex w-full flex-col gap-2 px-4 md:px-0">
      <div className="h-6 w-1/4 animate-pulse rounded bg-foreground/10" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-row items-center gap-3 rounded-[8px] p-3">
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-foreground/10" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
