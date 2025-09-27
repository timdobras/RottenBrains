import React, { FC } from "react";

interface ImageWithFallbackProps {
  imageUrl?: string | null; // The URL of the image
  altText: string; // Alt text for the image
  fallbackText?: string; // Optional fallback text to display when the image is unavailable
  fallbackIcon?: string; // Optional fallback icon URL
  quality?: string;
}

const ImageWithFallback: FC<ImageWithFallbackProps> = ({
  imageUrl,
  altText,
  fallbackText = "No image available",
  fallbackIcon = "/assets/images/logo_new_black.svg",
  quality = "w1280", // Default image quality (w500, w1280, etc.)
}) => {
  return imageUrl ? (
    <img
      src={`https://image.tmdb.org/t/p/${quality}${imageUrl}`}
      alt={altText}
      className="aspect-[16/9] h-full w-full overflow-hidden bg-foreground/10"
    />
  ) : (
    <div className="flex aspect-[16/9] h-full w-full flex-col items-center justify-center gap-2 bg-foreground/10">
      <img
        src={fallbackIcon}
        alt="Fallback Icon"
        className="invert-on-dark h-8 w-8 opacity-50"
      />
      <p className="text-xs text-foreground/50">{fallbackText}</p>
    </div>
  );
};

export default ImageWithFallback;
