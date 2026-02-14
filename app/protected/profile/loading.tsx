export default function ProfileLoading() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="aspect-[4/1] w-full animate-pulse rounded bg-foreground/10" />
      <div className="flex flex-row items-center gap-4 px-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-foreground/10" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-32 animate-pulse rounded bg-foreground/10" />
          <div className="h-4 w-24 animate-pulse rounded bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}
