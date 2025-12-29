'use client';

import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';

const DEFAULT_COLOR = 'hsl(220, 70%, 50%)';

// Fixed saturation and lightness for consistent look
const FIXED_SATURATION = 65; // percentage
const FIXED_LIGHTNESS = 45; // percentage

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Check if color is too grayscale (low saturation)
function isGrayscale(r: number, g: number, b: number): boolean {
  const { s } = rgbToHsl(r, g, b);
  return s < 10; // Less than 10% saturation = grayscale
}

// Convert RGB to normalized HSL string
function rgbToNormalizedHsl(r: number, g: number, b: number): string {
  // If the color is grayscale, return a neutral blue
  if (isGrayscale(r, g, b)) {
    return DEFAULT_COLOR;
  }

  const { h } = rgbToHsl(r, g, b);
  const hue = Math.round(h);

  return `hsl(${hue}, ${FIXED_SATURATION}%, ${FIXED_LIGHTNESS}%)`;
}

export function useAverageColor(imageUrl: string | undefined): string {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColor(DEFAULT_COLOR);
      return;
    }

    const fac = new FastAverageColor();

    fac
      .getColorAsync(imageUrl, {
        algorithm: 'sqrt', // Better perceptual accuracy
        mode: 'precision', // More accurate but slightly slower
        ignoredColor: [
          [0, 0, 0, 255, 50], // Ignore black (with threshold)
          [255, 255, 255, 255, 50], // Ignore white (with threshold)
        ],
      })
      .then((result) => {
        const [r, g, b] = result.value;
        const normalizedColor = rgbToNormalizedHsl(r, g, b);
        setColor(normalizedColor);
      })
      .catch(() => {
        setColor(DEFAULT_COLOR);
      });

    return () => {
      fac.destroy();
    };
  }, [imageUrl]);

  // Return default color during SSR and initial render to avoid hydration mismatch
  return color ?? DEFAULT_COLOR;
}
