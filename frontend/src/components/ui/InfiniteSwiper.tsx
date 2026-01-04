"use client";

import { useRef, useState, ReactNode, useEffect } from "react";

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

  // When index changes (after a successful swipe), we MUST reset the offset instantly
  // so the user doesn't see the "snap back".
  useEffect(() => {
    setIsAnimating(false);
    setOffset(0);
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsAnimating(false); // Disable animation for 1:1 tracking
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const current = e.touches[0].clientX;
    const delta = current - touchStart;
    setOffset(delta);
  };

  const handleTouchEnd = () => {
    if (touchStart === null) return;
    
    const width = containerRef.current?.offsetWidth || 0;
    const threshold = width * 0.25; // Swipe 25% to trigger

    if (offset > threshold) {
      // Swiped Right -> Go to Past (Index - 1)
      triggerSwipe(-1, width);
    } else if (offset < -threshold) {
      // Swiped Left -> Go to Future (Index + 1)
      triggerSwipe(1, width);
    } else {
      // Bounce back to center
      setIsAnimating(true);
      setOffset(0);
    }
    
    setTouchStart(null);
  };

  const triggerSwipe = (direction: -1 | 1, width: number) => {
    setIsAnimating(true);
    // 1. Animate visually to the next panel
    // If direction is 1 (Future), we want to slide to -66.66% (which is -33.33% - width)
    // If direction is -1 (Past), we want to slide to 0% (which is -33.33% + width)
    // Current base transform is -33.33% (Center Panel)
    
    // We visually move the container. 
    // direction 1 (Next) means we drag LEFT (negative offset).
    // direction -1 (Prev) means we drag RIGHT (positive offset).
    
    // Actually, let's just animate the 'offset' state to the full width
    // If dragging Left (negative offset), we want to animate to -width
    setOffset(direction === 1 ? -width : width);

    // 2. Wait for animation to finish, then fire logic
    setTimeout(() => {
      // The parent will update 'currentIndex'. 
      // The useEffect above will catch that change and reset offset to 0 instantly.
      onChange(currentIndex + direction); 
    }, 200);
  };

  return (
    <div 
      className="w-full h-full overflow-hidden relative"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex h-full w-[300%]"
        style={{
          // Base position is -33.333% (showing the middle panel)
          // We add the user's touch 'offset' in pixels
          transform: `translateX(calc(-33.333333% + ${offset}px))`,
          transition: isAnimating ? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)" : "none",
          willChange: "transform"
        }}
      >
        {/* Left Panel (Past: Offset -1) */}
        <div className="w-1/3 h-full shrink-0">
          {renderItem(-1)}
        </div>

        {/* Center Panel (Current: Offset 0) */}
        <div className="w-1/3 h-full shrink-0">
          {renderItem(0)}
        </div>

        {/* Right Panel (Future: Offset 1) */}
        <div className="w-1/3 h-full shrink-0">
          {renderItem(1)}
        </div>
      </div>
    </div>
  );
}