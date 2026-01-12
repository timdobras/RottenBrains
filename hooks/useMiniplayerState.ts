'use client';

import { useState, useCallback, useEffect } from 'react';
import useLocalStorage from './useLocalStorage';
import useIsMobile from './useIsMobile';
import { STORAGE_KEYS } from '@/lib/constants';
import { logger } from '@/lib/logger';

export type MiniplayerEdge = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface MiniplayerPosition {
  x: number;
  y: number;
  edge: MiniplayerEdge;
}

export interface MiniplayerSize {
  width: number;
  height: number;
}

interface PersistedState {
  edge: MiniplayerEdge;
  size: MiniplayerSize;
}

// Constraints
const MIN_WIDTH = 160;
const MAX_WIDTH = 900;
const ASPECT_RATIO = 16 / 9;
const EDGE_PADDING = 8;
const MOBILE_BOTTOM_PADDING = 72; // Account for mobile nav

const MOBILE_DEFAULTS: PersistedState = {
  edge: 'bottom-right',
  size: { width: 150, height: 150 / ASPECT_RATIO },
};

const DESKTOP_DEFAULTS: PersistedState = {
  edge: 'bottom-right',
  size: { width: 280, height: 280 / ASPECT_RATIO },
};

function getViewportDimensions() {
  if (typeof window === 'undefined') {
    return { width: 1920, height: 1080 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useMiniplayerState() {
  const isMobile = useIsMobile();
  const defaults = isMobile ? MOBILE_DEFAULTS : DESKTOP_DEFAULTS;

  const [persistedState, setPersistedState] = useLocalStorage<PersistedState>(
    STORAGE_KEYS.MINIPLAYER_STATE,
    defaults
  );

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [tempPosition, setTempPosition] = useState<{ x: number; y: number } | null>(null);

  // Calculate actual position from edge
  const calculatePositionFromEdge = useCallback(
    (edge: MiniplayerEdge, size: MiniplayerSize): { x: number; y: number } => {
      const viewport = getViewportDimensions();
      const bottomPadding = isMobile ? MOBILE_BOTTOM_PADDING : EDGE_PADDING;

      switch (edge) {
        case 'top-left':
          return { x: EDGE_PADDING, y: EDGE_PADDING };
        case 'top-right':
          return { x: viewport.width - size.width - EDGE_PADDING, y: EDGE_PADDING };
        case 'bottom-left':
          return { x: EDGE_PADDING, y: viewport.height - size.height - bottomPadding };
        case 'bottom-right':
        default:
          return {
            x: viewport.width - size.width - EDGE_PADDING,
            y: viewport.height - size.height - bottomPadding,
          };
      }
    },
    [isMobile]
  );

  // Calculate nearest edge from position
  const calculateNearestEdge = useCallback(
    (x: number, y: number, size: MiniplayerSize): MiniplayerEdge => {
      const viewport = getViewportDimensions();

      const centerX = x + size.width / 2;
      const centerY = y + size.height / 2;

      const isLeft = centerX < viewport.width / 2;
      const isTop = centerY < viewport.height / 2;

      if (isTop && isLeft) return 'top-left';
      if (isTop && !isLeft) return 'top-right';
      if (!isTop && isLeft) return 'bottom-left';
      return 'bottom-right';
    },
    []
  );

  // Handle drag end with snapping
  const handleDragEnd = useCallback(
    (finalX: number, finalY: number) => {
      const edge = calculateNearestEdge(finalX, finalY, persistedState.size);

      setPersistedState({
        ...persistedState,
        edge,
      });
      setTempPosition(null);
      setIsDragging(false);

      logger.debug('Miniplayer snapped to edge:', edge);
    },
    [persistedState, calculateNearestEdge, setPersistedState]
  );

  // Handle resize - called during drag, don't reset isResizing here
  const handleResize = useCallback(
    (newWidth: number) => {
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      const newHeight = clampedWidth / ASPECT_RATIO;

      const newSize = { width: clampedWidth, height: newHeight };

      setPersistedState({
        edge: persistedState.edge,
        size: newSize,
      });
      // Don't setIsResizing(false) here - that's done in mouseUp handler
    },
    [persistedState.edge, setPersistedState]
  );

  // Get current position based on persisted edge
  const currentPosition = calculatePositionFromEdge(persistedState.edge, persistedState.size);

  // Update position on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      // Position will be recalculated automatically via currentPosition
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  return {
    position: tempPosition || currentPosition,
    size: persistedState.size,
    edge: persistedState.edge,
    isDragging,
    isResizing,
    setIsDragging,
    setIsResizing,
    setTempPosition,
    handleDragEnd,
    handleResize,
    calculatePositionFromEdge,
    constraints: { MIN_WIDTH, MAX_WIDTH, ASPECT_RATIO, EDGE_PADDING, MOBILE_BOTTOM_PADDING },
  };
}
