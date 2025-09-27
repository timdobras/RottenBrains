"use client";

import React, { useRef, useState, useEffect } from "react";
// ^ Replace with any icon library or custom SVG you'd like.

interface HorizontalScrollProps {
  children: React.ReactNode;
  scrollDistance?: number; // how far to scroll each click
}

export default function HorizontalScroll({
  children,
  scrollDistance = 800, // default scroll 300px each time
}: HorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /**
   * Check if we can scroll left or right, based on the container's
   * scroll position and total scrollable width.
   */
  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    // if scrollLeft + visible width < total scrollable width
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
  };

  /**
   * Scroll to the left by `scrollDistance` pixels.
   */
  const handleScrollLeft = () => {
    containerRef.current?.scrollBy({
      left: -scrollDistance,
      behavior: "smooth",
    });
  };

  /**
   * Scroll to the right by `scrollDistance` pixels.
   */
  const handleScrollRight = () => {
    containerRef.current?.scrollBy({
      left: scrollDistance,
      behavior: "smooth",
    });
  };

  // Check on mount
  useEffect(() => {
    checkScroll();
  }, []);

  // Check when the user scrolls
  const handleOnScroll = () => {
    checkScroll();
  };

  return (
    <div className="relative w-full">
      {/* Left Scroll Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={handleScrollLeft}
          className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/80 p-2 text-white hover:bg-black/80 focus:outline-none md:flex"
        >
          <img
            src="/assets/icons/caret-left-solid.svg"
            alt=""
            className="h-4 w-4 invert"
          />
        </button>
      )}

      {/* The scrollable container */}
      <div
        ref={containerRef}
        className="hidden-scrollbar flex snap-x snap-mandatory flex-row gap-4 overflow-x-auto px-4 md:p-0"
        /* ^ optionally hide the scrollbar if you want
           Tailwind (or custom) might have .scrollbar-hide 
           or just override via CSS */
        onScroll={handleOnScroll}
      >
        {children}
      </div>

      {/* Right Scroll Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={handleScrollRight}
          className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/80 p-2 text-white hover:bg-black/80 focus:outline-none md:flex"
        >
          <img
            src="/assets/icons/caret-right-solid.svg"
            alt=""
            className="h-4 w-4 invert"
          />
        </button>
      )}
    </div>
  );
}
