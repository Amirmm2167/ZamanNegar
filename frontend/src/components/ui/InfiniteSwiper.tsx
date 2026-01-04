"use client";

import { useRef, useState, ReactNode, useEffect } from "react";

interface InfiniteSwiperProps {
  currentIndex: number;
  onChange: (newIndex: number) => void;
  renderItem: (offset: number) => ReactNode; 
}

export default function InfiniteSwiper({ currentIndex, onChange, renderItem }: InfiniteSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset offset instantly when index changes to maintain the illusion of infinite scrolling
  useEffect(() => {
    setIsAnimating(false);
    setOffset(0);
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsAnimating(false); // Disable animation for 1:1 finger tracking
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
    const threshold = width * 0.25; // 25% swipe threshold

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

  const triggerSwipe = (direction: number, width: number) => {
    setIsAnimating(true);
    // Animate the full width to finish the slide visually
    setOffset(direction === 1 ? -width : width); // direction 1 (Next) requires negative offset (slide left)

    // Wait for CSS transition, then update index
    setTimeout(() => {
      onChange(currentIndex + direction);
    }, 200);
  };

  return (
    <div 
      className="w-full h-full overflow-hidden relative touch-pan-y bg-[#121212]"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex h-full w-[300%]"
        style={{
          // Base position is -33.33% (showing the middle panel) + user offset
          transform: `translateX(calc(-33.333333% + ${offset}px))`,
          transition: isAnimating ? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)" : "none",
          willChange: "transform"
        }}
      >
        {/* Past Panel */}
        <div className="w-1/3 h-full shrink-0 relative border-r border-white/5">{renderItem(-1)}</div>
        
        {/* Current Panel */}
        <div className="w-1/3 h-full shrink-0 relative border-r border-white/5">{renderItem(0)}</div>
        
        {/* Future Panel */}
        <div className="w-1/3 h-full shrink-0 relative">{renderItem(1)}</div>
      </div>
    </div>
  );
}