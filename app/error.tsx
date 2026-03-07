'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-medium">Something went wrong</h2>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-accent px-4 py-2 text-sm text-background transition-opacity hover:opacity-80"
      >
        Try again
      </button>
    </div>
  );
}
