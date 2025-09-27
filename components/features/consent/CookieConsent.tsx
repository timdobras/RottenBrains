"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "true");
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("cookieConsent", "true");
    setIsVisible(false); // Simply hide the popup without saving consent
  };

  if (!isVisible) return null;

  return (
    <div className="max-w-screen fixed bottom-4 right-4 z-50 ml-4 overflow-hidden rounded-[8px] bg-background text-foreground drop-shadow-md md:max-w-xl">
      <div className="flex h-full w-full flex-row items-center justify-between gap-4 bg-foreground/10 p-6">
        <span className="flex-1">
          By browsing this website, you accept our{" "}
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
