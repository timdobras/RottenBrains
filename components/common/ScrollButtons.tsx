'use client'; // Ensure this is a client component

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

const ScrollButtons = ({
  containerId,
  scrollPercent = 50,
}: {
  containerId: string;
  scrollPercent?: number;
}) => {
  const scrollLeft = () => {
    const scrollContainer = document.getElementById(containerId);
    if (scrollContainer) {
      const scrollAmount = (window.innerWidth * scrollPercent) / 100;
      scrollContainer.scrollBy({
        top: 0,
        left: -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const scrollRight = () => {
    const scrollContainer = document.getElementById(containerId);
    if (scrollContainer) {
      const scrollAmount = (window.innerWidth * scrollPercent) / 100;
      scrollContainer.scrollBy({
        top: 0,
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="hidden flex-row gap-4 md:flex">
      <button
        onClick={scrollLeft}
        className="z-10 rounded-full border border-foreground/10 p-2 drop-shadow-lg hover:bg-foreground/20"
      >
        <ChevronLeft className="aspect-[1/1] h-4 w-4" />
      </button>
      <button
        onClick={scrollRight}
        className="z-10 rounded-full border border-foreground/10 p-2 drop-shadow-lg hover:bg-foreground/20"
      >
        <ChevronRight className="aspect-[1/1] h-4 w-4" />
      </button>
    </div>
  );
};

export default ScrollButtons;
