"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

interface InfiniteSwiperProps {
  currentIndex: number;
  onChange: (newIndex: number) => void;
  renderItem: (offset: number) => ReactNode; // offset: -1 (Past), 0 (Current), 1 (Future)
}

export default function InfiniteSwiper({ currentIndex, onChange, renderItem }: InfiniteSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Constants
  const threshold = 100; // px to trigger swipe

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsAnimating(false); // Disable transition for 1:1 movement
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const current = e.touches[0].clientX;
    const delta = current - touchStart;
    setOffset(delta);
  };

  const handleTouchEnd = () => {
    if (touchStart === null) return;
    
    // Snap Logic
    if (offset > threshold) {
      // Swipe Right -> Go Past
      triggerChange(-1);
    } else if (offset < -threshold) {
      // Swipe Left -> Go Future
      triggerChange(1);
    } else {
      // Reset (Bounce back)
      setIsAnimating(true);
      setOffset(0);
    }
    
    setTouchStart(null);
  };

  const triggerChange = (direction: -1 | 1) => {
    setIsAnimating(true);
    // 1. Animate to the full width
    const width = containerRef.current?.offsetWidth || 0;
    setOffset(direction * width);

    // 2. Wait for animation, then reset instantly
    setTimeout(() => {
      setIsAnimating(false);
      onChange(currentIndex - direction); // Note: Swiping Left (negative delta) means INCREASING index (Future)
      setOffset(0); // Snap back to center instantly (user won't see it because data swapped)
    }, 200); // Match CSS transition duration
  };

  return (
    <div 
      className="flex-1 overflow-hidden relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={containerRef}
    >
      <div 
        className="flex h-full w-[300%]"
        style={{
          // We start at -100% (Center Panel), then add user offset
          transform: `translateX(calc(-33.333% + ${offset}px))`,
          transition: isAnimating ? "transform 200ms ease-out" : "none",
          willChange: "transform"
        }}
      >
        {/* Left Panel (Past) */}
        <div className="w-1/3 h-full flex-shrink-0">
          {renderItem(-1)}
        </div>

        {/* Center Panel (Current) */}
        <div className="w-1/3 h-full flex-shrink-0">
          {renderItem(0)}
        </div>

        {/* Right Panel (Future) */}
        <div className="w-1/3 h-full flex-shrink-0">
          {renderItem(1)}
        </div>
      </div>
    </div>
  );
}