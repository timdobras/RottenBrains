"use client";

import React, { useEffect, useRef, useState } from "react";

type AdBannerProps = {
  dataAdSlot: string;
  dataAdFormat: string;
  dataFullWidthResponsive: boolean;
};

export default function AdBanner({
  dataAdSlot,
  dataAdFormat,
  dataFullWidthResponsive,
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [adBlocked, setAdBlocked] = useState(false);

  useEffect(() => {
    // Attempt to push the ad
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push(
        {},
      );
    } catch (error) {
      // If it fails immediately, fallback.
      return;
    }

    // Wait a bit, then measure the container's height
    const timer = setTimeout(() => {
      if (adRef.current) {
        const height = adRef.current.offsetHeight;
        // If the ad container is 0 height, it likely didn't load -> ad blocked
        if (height < 1) {
          setAdBlocked(true);
        }
      }
    }, 5000); // 2.5s delay, adjust as needed

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* The container for our ad. We will measure its size. */}
      <div
        ref={adRef}
        className="relative overflow-hidden rounded-[8px] border border-foreground/10"
      >
        <ins
          className="adsbygoogle mx-auto"
          style={{ display: "block" }}
          data-ad-client="ca-pub-4557341861686356"
          data-ad-slot={dataAdSlot}
          data-ad-format={dataAdFormat}
          data-full-width-responsive={dataFullWidthResponsive.toString()}
        />
      </div>

      {/* Fallback content, displayed only if we detect no ad loaded */}
      {adBlocked && (
        <div className="flex h-full w-full items-center justify-center bg-accent text-center">
          <p>Disable ad block to support us </p>
        </div>
      )}
    </>
  );
}
