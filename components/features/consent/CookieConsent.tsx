'use client';

import Link from 'next/link';
import useHasMounted from '@/hooks/useHasMounted';
import useLocalStorage from '@/hooks/useLocalStorage';

const CookieConsent: React.FC = () => {
  const mounted = useHasMounted();
  const [consent, setConsent] = useLocalStorage<string>('cookieConsent', '');

  const handleDismiss = () => {
    setConsent('true');
  };

  // Render nothing until mounted (avoids hydration mismatch) or once accepted.
  if (!mounted || consent) return null;

  return (
    <div className="max-w-screen fixed bottom-4 right-4 z-50 ml-4 overflow-hidden rounded-[8px] bg-background text-foreground drop-shadow-md md:max-w-xl">
      <div className="flex h-full w-full flex-row items-center justify-between gap-4 bg-foreground/10 p-6">
        <span className="flex-1">
          By browsing this website, you accept our{' '}
          <Link href="/cookie-policy" className="text-primary">
            cookies policy
          </Link>
          .
        </span>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss cookie consent popup"
          className="flex aspect-[1/1] h-full flex-shrink-0 items-center justify-center rounded-full p-4 hover:bg-foreground/10"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;

// nice
