import Link from 'next/link';

export default function PremiumPage() {
  return (
    <div className="relative mx-auto flex h-screen w-full flex-1 flex-col items-center justify-center gap-6 px-8 sm:max-w-lg">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold text-foreground">Premium Access Required</h1>
        <p className="text-md text-foreground/70">
          This content is available exclusively to premium members. Upgrade your account to unlock
          full access to all features, including streaming, reviews, and more.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-accent px-6 py-2 text-foreground transition-opacity hover:opacity-90"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
