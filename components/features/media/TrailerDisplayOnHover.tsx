"use client";

import React, { useState, useEffect, useRef, useContext } from "react";
import { getVideos } from "@/lib/tmdb";
import { MobileVideoContext } from "@/hooks/MobileVideoContext";
import ImageWithFallback from "@/components/features/media/ImageWithFallback";

interface HoverImageProps {
  imageUrl: string | null | undefined;
  altText: string;
  media_type: string; // "movie" or "tv"
  media_id: number;
  children?: React.ReactNode;
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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeVisible, setIframeVisible] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { currentPlayingMediaId, registerHoverImage, unregisterHoverImage } =
    useContext(MobileVideoContext);

  // Detect if the device is mobile
  useEffect(() => {
    const isMobile =
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
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

  // Fetch the video
  const fetchVideo = async () => {
    try {
      const data = await getVideos(media_type, media_id);

      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const trailer =
          data.results.find(
            (video: any) =>
              video.type === "Trailer" && video.site === "YouTube",
          ) || data.results.find((video: any) => video.site === "YouTube");

        if (trailer && trailer.key && trailer.site === "YouTube") {
          const videoUrl = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&cc_load_policy=1&cc_lang_pref=en`;
          setVideoUrl(videoUrl);
        } else {
          setVideoUrl(null);
          setIsLoading(false);
        }
      } else {
        setVideoUrl(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch video:", error);
      setVideoUrl(null);
      setIsLoading(false);
    }
  };

  // Handle playing and stopping video based on currentPlayingMediaId
  useEffect(() => {
    if (isMobileDevice) {
      if (currentPlayingMediaId === media_id) {
        // This component should play the video
        if (!showOverlay) {
          setIsLoading(true);
          const timeoutId = setTimeout(() => {
            setShowOverlay(true);
            fetchVideo();
          }, 1000);
          return () => {
            clearTimeout(timeoutId);
          };
        }
      } else {
        // This component should stop playing
        if (showOverlay || isLoading) {
          setShowOverlay(false);
          setIsLoading(false);
          setIframeVisible(false);
          setVideoUrl(null);
        }
      }
    }
  }, [currentPlayingMediaId, isMobileDevice, media_id]);

  // Desktop Hover Effect
  useEffect(() => {
    if (isMobileDevice) return;

    let hoverTimeout: NodeJS.Timeout | null = null;

    if (isHovered) {
      setIsLoading(true);
      setShowOverlay(true);
      fetchVideo();
    } else {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      setShowOverlay(false);
      setIsLoading(false);
      setIframeVisible(false);
      setVideoUrl(null);
    }

    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [isHovered, isMobileDevice]);

  // Handle iframe load and add 0.2-second delay with fade-in effect
  const handleIframeLoad = () => {
    setIframeVisible(true);
    setIsLoading(false);
  };

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
        quality={"w1280"}
      />
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
                  iframeVisible ? "opacity-100" : "opacity-0"
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
