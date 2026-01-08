"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, useMotionValue, animate, PanInfo } from "framer-motion";

interface InfiniteSwiperProps {
  currentIndex: number;
  onChange: (index: number) => void;
  renderItem: (offset: number) => ReactNode;
}

export default function InfiniteSwiper({ currentIndex, onChange, renderItem }: InfiniteSwiperProps) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) setWidth(containerRef.current.offsetWidth);
  }, []);

  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipeThreshold = width / 4;
    const swipePower = Math.abs(offset.x) * velocity.x;

    if (offset.x > swipeThreshold || swipePower > 10000) {
      // Swiped Right -> Previous
      onChange(currentIndex - 1);
    } else if (offset.x < -swipeThreshold || swipePower < -10000) {
      // Swiped Left -> Next
      onChange(currentIndex + 1);
    }
    // Always animate back to center; the index change will replace the content
    animate(x, 0, { type: "spring", bounce: 0, duration: 0.3 });
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative touch-pan-y">
      <motion.div
        className="flex h-full w-full"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
        {/* Render Previous Panel */}
        <div className="w-full h-full shrink-0 relative right-full">{renderItem(-1)}</div>
        
        {/* Render Current Panel */}
        <div className="w-full h-full shrink-0">{renderItem(0)}</div>
        
        {/* Render Next Panel */}
        <div className="w-full h-full shrink-0 relative left-full">{renderItem(1)}</div>
      </motion.div>
    </div>
  );
}