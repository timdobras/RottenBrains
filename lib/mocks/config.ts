/**
 * Offline mode configuration
 * Enable with NEXT_PUBLIC_OFFLINE_MODE=true in .env.local
 * Disable debug panels with NEXT_PUBLIC_DISABLE_DEBUG=true
 */

export function isOfflineMode(): boolean {
  return process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
}

export function isDebugDisabled(): boolean {
  // Debug is disabled if explicitly set OR if in offline mode
  return (
    process.env.NEXT_PUBLIC_DISABLE_DEBUG === 'true' ||
    isOfflineMode()
  );
}

export function isVPNDetectionDisabled(): boolean {
  // VPN detection can be disabled separately from other debug features
  return process.env.NEXT_PUBLIC_DISABLE_VPN_DETECTION === 'true';
}

export function getOfflineModeStatus() {
  return {
    enabled: isOfflineMode(),
    debugDisabled: isDebugDisabled(),
    mockUserCount: 2,
    mockMovieCount: 50,
    mockTvCount: 50,
  };
}

/**
 * Get the full URL for a TMDB image
 * In offline mode, returns local path from /mock-images/
 * Online mode uses TMDB CDN
 * @param imagePath - The image path (e.g., "/abc123.jpg")
 * @param size - The image size (e.g., "w500", "w1280", "w185")
 */
export function getTMDBImageUrl(imagePath: string | null | undefined, size: string = 'w500'): string | null {
  if (!imagePath) return null;

  if (isOfflineMode()) {
    // Remove leading slash and serve from local mock-images folder
    const filename = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `/mock-images/${filename}`;
  }

  // Online mode: use TMDB CDN
  return `https://image.tmdb.org/t/p/${size}${imagePath}`;
}
