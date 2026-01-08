"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { motion, useMotionValue, animate, PanInfo } from "framer-motion";

interface InfiniteSwiperProps {
  currentIndex: number;
  onChange: (index: number) => void;
  renderItem: (offset: number) => ReactNode;
}

export default function InfiniteSwiper({ currentIndex, onChange, renderItem }: InfiniteSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  
  useEffect(() => {
    const updateWidth = () => {
        if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipeThreshold = width * 0.25;
    const swipePower = Math.abs(offset.x) * velocity.x;

    if (offset.x > swipeThreshold || swipePower > 10000) {
      // Swiped Right -> Go NEXT (As requested)
      onChange(currentIndex + 1);
    } else if (offset.x < -swipeThreshold || swipePower < -10000) {
      // Swiped Left -> Go PREV
      onChange(currentIndex - 1);
    }
    
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full overflow-hidden relative touch-pan-y" 
        style={{ touchAction: "pan-y" }}
    >
      <motion.div
        className="flex h-full absolute top-0 right-0 will-change-transform"
        style={{ 
            width: width * 3,
            x: x,
            right: -width, 
        }}
        drag="x"
        dragConstraints={{ left: -width, right: width }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        {/* Render Order for Vice-Versa Logic */}
        
        {/* Left Side (swiped into from Right) -> Next Day */}
        <div className="w-[33.33%] h-full shrink-0">
            {renderItem(1)} 
        </div>

        {/* Center */}
        <div className="w-[33.33%] h-full shrink-0">
            {renderItem(0)}
        </div>

        {/* Right Side (swiped into from Left) -> Prev Day */}
        <div className="w-[33.33%] h-full shrink-0">
            {renderItem(-1)}
        </div>

      </motion.div>
    </div>
  );
}