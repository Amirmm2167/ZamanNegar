"use client";

import { useEffect, useState } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";

interface InfiniteSwiperProps {
  currentIndex: number;
  onChange: (newIndex: number) => void;
  renderItem: (offset: number) => React.ReactNode; 
}

export default function InfiniteSwiper({ currentIndex, onChange, renderItem }: InfiniteSwiperProps) {
  const controls = useAnimation();

  // Reset position whenever index changes to keep the "infinite" illusion
  useEffect(() => {
    controls.set({ x: "0%" });
  }, [currentIndex, controls]);

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 50; // lowered threshold for easier swiping
    const velocityThreshold = 200;

    // Swipe Right (Go to Past)
    if (offset.x > threshold || velocity.x > velocityThreshold) {
      await controls.start({ x: "100%", transition: { type: "spring", stiffness: 300, damping: 30 } });
      onChange(currentIndex - 1);
      controls.set({ x: "0%" });
    } 
    // Swipe Left (Go to Future)
    else if (offset.x < -threshold || velocity.x < -velocityThreshold) {
      await controls.start({ x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } });
      onChange(currentIndex + 1);
      controls.set({ x: "0%" });
    } 
    // Snap back to center if swipe wasn't strong enough
    else {
      controls.start({ x: "0%", transition: { type: "spring", stiffness: 400, damping: 40 } });
    }
  };

  return (
    <div className="w-full h-full overflow-hidden bg-[#121212] relative">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        // CRITICAL FIX: "pan-y" allows the browser to handle vertical scrolling (your grid),
        // while framer-motion handles the horizontal drag (swiping days).
        style={{ x: "0%", touchAction: "pan-y" }} 
        className="flex h-full w-full absolute top-0 left-0"
      >
        {/* Past Panel */}
        <div className="absolute top-0 left-[-100%] w-full h-full border-r border-white/5">
          {renderItem(-1)}
        </div>

        {/* Current Panel */}
        <div className="absolute top-0 left-0 w-full h-full border-r border-white/5">
          {renderItem(0)}
        </div>

        {/* Future Panel */}
        <div className="absolute top-0 left-[100%] w-full h-full">
          {renderItem(1)}
        </div>
      </motion.div>
    </div>
  );
}