'use client';

import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ImageWithFallback from '@/components/features/media/ImageWithFallback';
import { MobileVideoContext } from '@/hooks/MobileVideoContext';
import { getVideos } from '@/lib/tmdb';
import { queryKeys } from '@/lib/queryKeys';

interface HoverImageProps {
  imageUrl: string | null | undefined;
  altText: string;
  media_type: string; // "movie" or "tv"
  media_id: number;
  children?: React.ReactNode;
}

// Extract trailer URL from video data
function extractTrailerUrl(data: { results?: Array<{ type?: string; site?: string; key?: string }> } | null): string | null {
  if (!data || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }

  const trailer =
    data.results.find((video) => video.type === 'Trailer' && video.site === 'YouTube') ||
    data.results.find((video) => video.site === 'YouTube');

  if (trailer && trailer.key && trailer.site === 'YouTube') {
    return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&cc_load_policy=1&cc_lang_pref=en`;
  }

  return null;
}

const TrailerDisplayOnHover: React.FC<HoverImageProps> = ({
  imageUrl,
  altText,
  media_type,
  media_id,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [iframeVisible, setIframeVisible] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { currentPlayingMediaId, registerHoverImage, unregisterHoverImage } =
    useContext(MobileVideoContext);

  // Determine if we should fetch (on hover for desktop, on play for mobile)
  const shouldFetch = useMemo(() => {
    if (isMobileDevice) {
      return currentPlayingMediaId === media_id;
    }
    return isHovered;
  }, [isMobileDevice, currentPlayingMediaId, media_id, isHovered]);

  // Use React Query for caching trailer data (1 hour staleTime)
  const { data: videoData, isLoading: isFetching } = useQuery({
    queryKey: queryKeys.media.videos(media_type, media_id),
    queryFn: () => getVideos(media_type, media_id),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 60, // 1 hour - trailers don't change
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
  });

  // Extract trailer URL from cached data
  const videoUrl = useMemo(() => extractTrailerUrl(videoData), [videoData]);

  // Show loading only when actively fetching
  const isLoading = shouldFetch && isFetching && !videoData;

  // Detect if the device is mobile
  useEffect(() => {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    setIsMobileDevice(isMobile);
  }, []);

  // Register and unregister the element with the context
  useEffect(() => {
    if (isMobileDevice && ref.current) {
      registerHoverImage(media_id, ref.current);
    }

    return () => {
      if (isMobileDevice) {
        unregisterHoverImage(media_id);
      }
    };
  }, [media_id, registerHoverImage, unregisterHoverImage, isMobileDevice]);

  // Handle playing and stopping video based on currentPlayingMediaId (mobile)
  useEffect(() => {
    if (isMobileDevice) {
      if (currentPlayingMediaId === media_id) {
        // This component should play the video
        if (!showOverlay) {
          const timeoutId = setTimeout(() => {
            setShowOverlay(true);
          }, 1000);
          return () => {
            clearTimeout(timeoutId);
          };
        }
      } else {
        // This component should stop playing
        if (showOverlay) {
          setShowOverlay(false);
          setIframeVisible(false);
        }
      }
    }
  }, [currentPlayingMediaId, isMobileDevice, media_id, showOverlay]);

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

  // Handle iframe load with fade-in effect
  const handleIframeLoad = () => {
    setIframeVisible(true);
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={!isMobileDevice ? () => setIsHovered(true) : undefined}
      onMouseLeave={!isMobileDevice ? () => setIsHovered(false) : undefined}
      ref={ref}
      data-media-id={media_id}
    >
      <ImageWithFallback imageUrl={imageUrl} altText={altText} quality={'w1280'} />
      {children}

      {/* Loading Bar */}
      {isLoading && (
        <div className="animate-loading absolute left-0 top-0 h-1 w-full bg-accent"></div>
      )}

      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          {videoUrl ? (
            <>
              <iframe
                width="100%"
                height="100%"
                src={videoUrl}
                title="Media Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={handleIframeLoad}
                className={`transition-opacity delay-200 duration-500 ${
                  iframeVisible ? 'opacity-100' : 'opacity-0'
                }`}
              ></iframe>
              {/* Do not remove this div */}
              <div className="absolute inset-0"></div>
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
