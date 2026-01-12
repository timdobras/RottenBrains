// This module can only be used on the server (uses sharp)
// For client components, pass the color as a prop from a server component parent

import { logger } from '@/lib/logger';

const DEFAULT_COLOR = { hex: '#3b82f6' };
const FETCH_TIMEOUT_MS = 3000; // 3 second timeout for image fetches

// In-memory cache for color results
const colorCache = new Map<string, { hex: string }>();
const MAX_CACHE_SIZE = 200;

export async function getAverageColorSafe(imageUrl: string): Promise<{ hex: string }> {
  // Only run on server
  if (typeof window !== 'undefined') {
    return DEFAULT_COLOR;
  }

  // Skip in development to avoid slow dev server issues
  if (process.env.NODE_ENV === 'development') {
    return DEFAULT_COLOR;
  }

  // Check cache first
  const cached = colorCache.get(imageUrl);
  if (cached) {
    return cached;
  }

  try {
    // Dynamically import sharp to avoid bundling issues
    const sharp = (await import('sharp')).default;

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.debug('[getAverageColorSafe] Fetch failed:', imageUrl, response.status);
      return DEFAULT_COLOR;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Resize to 1x1 pixel to get the average color
    const { data } = await sharp(buffer).resize(1, 1).raw().toBuffer({ resolveWithObject: true });

    const r = data[0];
    const g = data[1];
    const b = data[2];

    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    const result = { hex };

    // Cache the result
    if (colorCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = colorCache.keys().next().value;
      if (firstKey) colorCache.delete(firstKey);
    }
    colorCache.set(imageUrl, result);

    return result;
  } catch (error) {
    // Don't log aborted requests (timeout) at error level
    if (error instanceof Error && error.name === 'AbortError') {
      logger.debug('[getAverageColorSafe] Timeout:', imageUrl);
    } else {
      logger.debug('[getAverageColorSafe] Error:', imageUrl, error);
    }
    return DEFAULT_COLOR;
  }
}
