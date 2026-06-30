'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import ImageWithFallback from '@/components/features/media/ImageWithFallback';
import { getVideos } from '@/lib/tmdb';
import { queryKeys } from '@/lib/queryKeys';

interface HoverImageProps {
  imageUrl: string | null | undefined;
  altText: string;
  media_type: string; // "movie" or "tv"
  media_id: number;
  children?: React.ReactNode;
  progressive?: boolean;
}

// Extract trailer key and URL from video data
export function extractTrailerInfo(
  data: { results?: Array<{ type?: string; site?: string; key?: string }> } | null
): { key: string; url: string } | null {
  if (!data || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }

  const trailer =
    data.results.find((video) => video.type === 'Trailer' && video.site === 'YouTube') ||
    data.results.find((video) => video.site === 'YouTube');

  if (trailer && trailer.key && trailer.site === 'YouTube') {
    return {
      key: trailer.key,
      url: `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&cc_load_policy=1&cc_lang_pref=en`,
    };
  }

  return null;
}

const TrailerDisplayOnHover: React.FC<HoverImageProps> = ({
  imageUrl,
  altText,
  media_type,
  media_id,
  children,
  progressive = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [iframeVisible, setIframeVisible] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [mobilePlayRequested, setMobilePlayRequested] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // On mobile, we only fetch + show iframe when user explicitly taps play
  // On desktop, we fetch on hover (existing behavior)
  const shouldFetch = useMemo(() => {
    if (isMobileDevice) {
      return mobilePlayRequested;
    }
    return isHovered;
  }, [isMobileDevice, mobilePlayRequested, isHovered]);

  // Use React Query for caching trailer data (1 hour staleTime)
  const { data: videoData, isLoading: isFetching } = useQuery({
    queryKey: queryKeys.media.videos(media_type, media_id),
    queryFn: () => getVideos(media_type, media_id),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 60, // 1 hour - trailers don't change
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
  });

  // Extract trailer info from cached data
  const trailerInfo = useMemo(() => extractTrailerInfo(videoData), [videoData]);

  // Show loading only when actively fetching
  const isLoading = shouldFetch && isFetching && !videoData;

  // Detect if the device is mobile via matchMedia (more reliable than UA sniffing)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobileDevice(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileDevice(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Desktop Hover Effect
  useEffect(() => {
    if (isMobileDevice) return;

    if (isHovered) {
      setShowOverlay(true);
    } else {
      setShowOverlay(false);
      setIframeVisible(false);
    }
  }, [isHovered, isMobileDevice]);

  // Mobile: show iframe overlay once data is fetched after user tapped play
  useEffect(() => {
    if (isMobileDevice && mobilePlayRequested && trailerInfo) {
      setShowOverlay(true);
    }
  }, [isMobileDevice, mobilePlayRequested, trailerInfo]);

  // Handle iframe load with fade-in effect
  const handleIframeLoad = useCallback(() => {
    setIframeVisible(true);
  }, []);

  // Mobile tap-to-play handler
  const handleMobilePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMobilePlayRequested(true);
  }, []);

  // Mobile stop handler
  const handleMobileStop = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMobilePlayRequested(false);
    setShowOverlay(false);
    setIframeVisible(false);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={!isMobileDevice ? () => setIsHovered(true) : undefined}
      onMouseLeave={!isMobileDevice ? () => setIsHovered(false) : undefined}
      ref={ref}
      data-media-id={media_id}
    >
      <ImageWithFallback
        imageUrl={imageUrl}
        altText={altText}
        quality={'w780'}
        progressive={progressive}
      />
      {children}

      {/* Loading Bar */}
      {isLoading && (
        <div className="animate-loading absolute left-0 top-0 h-1 w-full bg-accent"></div>
      )}

      {/* Mobile: show a play button overlay instead of auto-loading iframe */}
      {isMobileDevice && !showOverlay && (
        <button
          onClick={handleMobilePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/0"
          aria-label="Play trailer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="white" className="ml-0.5 h-5 w-5" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          {trailerInfo?.url ? (
            <>
              <iframe
                width="100%"
                height="100%"
                src={trailerInfo.url}
                title="Media Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={handleIframeLoad}
                className={`transition-opacity delay-200 duration-500 ${
                  iframeVisible ? 'opacity-100' : 'opacity-0'
                }`}
              ></iframe>
              {/* Overlay to prevent iframe interaction + close button on mobile */}
              <div className="absolute inset-0">
                {isMobileDevice && (
                  <button
                    onClick={handleMobileStop}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                    aria-label="Close trailer"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-white"></div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrailerDisplayOnHover;
