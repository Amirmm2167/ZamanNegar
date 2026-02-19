"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, useMotionValue, animate, PanInfo } from "framer-motion";

interface InfiniteSwiperProps {
  onSwipeRight: () => void; // RTL: Navigates to Next/Future
  onSwipeLeft: () => void;  // RTL: Navigates to Prev/Past
  renderItem: (offset: -1 | 0 | 1) => ReactNode;
}

export default function InfiniteSwiper({ onSwipeRight, onSwipeLeft, renderItem }: InfiniteSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    
    // Scroll Stability: Auto-scroll to ~8:00 AM on initial mount
    if (containerRef.current) {
        containerRef.current.scrollTop = 8 * 60; 
    }
    
    return () => window.removeEventListener("resize", measure);
  }, []);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipeThreshold = width * 0.2; // 20% of screen width to trigger a change
    const velocityThreshold = 400; // Pixels per second to trigger a quick flick

    let targetX = 0;
    let action: 'right' | 'left' | null = null;

    // Fixed RTL Physics Logic:
    // Swipe Right (offset > 0, velocity > 0) -> Pulls Future/Next into view
    // Swipe Left (offset < 0, velocity < 0) -> Pulls Past/Prev into view
    if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
      targetX = width;
      action = 'right';
    } else if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
      targetX = -width;
      action = 'left';
    }

    animate(x, targetX, { 
      type: "spring", 
      stiffness: 300, 
      damping: 30,
      onComplete: () => {
        if (action === 'right') {
            onSwipeRight();
            x.set(0); // Teleport back instantly
        } else if (action === 'left') {
            onSwipeLeft();
            x.set(0);
        } else {
            x.set(0); // Snap back to center if swipe was aborted
        }
      }
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-y-auto overflow-x-hidden relative scrollbar-hide bg-[#020205]"
      style={{ touchAction: "pan-y" }} // Crucial for native vertical scrolling while swiping
    >
      <motion.div
        className="flex h-max relative"
        style={{ 
          x, 
          width: width ? width * 3 : '300%', 
          right: width ? -width : '-100%', 
        }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -width, right: width }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        dir="rtl" 
      >
        {/* Render Order: [Rightmost(Past), Middle(Current), Leftmost(Future)] */}
        <div className="w-[33.333%] shrink-0 h-full">{width > 0 && renderItem(-1)}</div>
        <div className="w-[33.333%] shrink-0 h-full">{width > 0 && renderItem(0)}</div>
        <div className="w-[33.333%] shrink-0 h-full">{width > 0 && renderItem(1)}</div>
      </motion.div>
    </div>
  );
}