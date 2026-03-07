'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface HorizontalScrollProps {
  children: React.ReactNode;
  scrollDistance?: number;
  /** Additional classes applied to the scrollable container */
  className?: string;
}

export default function HorizontalScroll({
  children,
  scrollDistance = 800,
  className,
}: HorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
  };

  const handleScrollLeft = () => {
    containerRef.current?.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    containerRef.current?.scrollBy({ left: scrollDistance, behavior: 'smooth' });
  };

  useEffect(() => {
    checkScroll();
  }, []);

  return (
    <div className="relative w-full">
      {canScrollLeft && (
        <button
          type="button"
          onClick={handleScrollLeft}
          className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/80 p-2 text-white hover:bg-black/80 focus:outline-none md:flex"
        >
          <img src="/assets/icons/caret-left-solid.svg" alt="" className="h-4 w-4 invert" />
        </button>
      )}

      <div
        ref={containerRef}
        className={cn(
          'hidden-scrollbar flex flex-row gap-4 overflow-x-auto overscroll-x-contain pl-4 md:pl-0',
          className
        )}
        onScroll={checkScroll}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={handleScrollRight}
          className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/80 p-2 text-white hover:bg-black/80 focus:outline-none md:flex"
        >
          <img src="/assets/icons/caret-right-solid.svg" alt="" className="h-4 w-4 invert" />
        </button>
      )}
    </div>
  );
}
