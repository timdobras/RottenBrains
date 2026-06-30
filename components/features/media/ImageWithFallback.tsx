'use client';

import React, { FC } from 'react';
import { getTMDBImageUrl, isOfflineMode } from '@/lib/mocks/config';
import { LogoMark } from '@/components/ui/Logo';
import ProgressiveImage from './ProgressiveImage';

// TMDB image widths available for responsive srcSet
const TMDB_WIDTHS = [
  { size: 'w300', width: 300 },
  { size: 'w500', width: 500 },
  { size: 'w780', width: 780 },
  { size: 'w1280', width: 1280 },
] as const;

interface ImageWithFallbackProps {
  imageUrl?: string | null; // The URL of the image
  altText: string; // Alt text for the image
  fallbackText?: string; // Optional fallback text to display when the image is unavailable
  quality?: string;
  sizes?: string; // Responsive sizes attribute
  progressive?: boolean; // Enable progressive loading (low-res → high-res fade-in)
}

const ImageWithFallback: FC<ImageWithFallbackProps> = ({
  imageUrl,
  altText,
  fallbackText = 'No image available',
  quality = 'w500', // Default image quality (w500, w780, w1280, etc.) - w500 for most thumbnails
  sizes = '(max-width: 767px) 50vw, (max-width: 1024px) 33vw, 25vw',
  progressive = true,
}) => {
  // Progressive mode: load low-res first, then upgrade
  if (progressive && imageUrl) {
    return (
      <div className="relative aspect-[16/9] h-full w-full bg-foreground/10">
        <ProgressiveImage backdropPath={imageUrl} alt={altText} />
      </div>
    );
  }

  const fullImageUrl = getTMDBImageUrl(imageUrl, quality);

  // Build responsive srcSet for TMDB images (skip in offline mode)
  const srcSet =
    imageUrl && !isOfflineMode()
      ? TMDB_WIDTHS.map(({ size, width }) => `${getTMDBImageUrl(imageUrl, size)} ${width}w`).join(
          ', '
        )
      : undefined;

  return fullImageUrl ? (
    <img
      src={fullImageUrl}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={altText}
      loading="lazy"
      decoding="async"
      width={500}
      height={281}
      className="aspect-[16/9] h-full w-full overflow-hidden bg-foreground/10 object-cover"
    />
  ) : (
    <div className="flex aspect-[16/9] h-full w-full flex-col items-center justify-center gap-2 bg-foreground/10">
      <LogoMark className="h-8 w-8 text-foreground opacity-50" />
      <p className="text-xs text-foreground/50">{fallbackText}</p>
    </div>
  );
};

export default ImageWithFallback;
