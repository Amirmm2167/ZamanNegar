"use client";

import { useEffect } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";

interface InfiniteSwiperProps {
  currentIndex: number;
  onChange: (newIndex: number) => void;
  renderItem: (offset: number) => React.ReactNode; 
}

export default function InfiniteSwiper({ currentIndex, onChange, renderItem }: InfiniteSwiperProps) {
  const controls = useAnimation();

  useEffect(() => {
    controls.set({ x: "0%" });
  }, [currentIndex, controls]);

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 50; 
    const velocityThreshold = 200;

    // RTL SWIPE LOGIC
    // Next Day is on the LEFT (-100%). To see it, we drag content RIGHT (offset > 0).
    // Previous Day is on the RIGHT (+100%). To see it, we drag content LEFT (offset < 0).

    // Swipe Right (Go to Future/Next)
    if (offset.x > threshold || velocity.x > velocityThreshold) {
      // Animate content to Right (showing what's on the left)
      await controls.start({ x: "100%", transition: { type: "spring", stiffness: 300, damping: 30 } });
      onChange(currentIndex + 1); // +1 is Future
      controls.set({ x: "0%" });
    } 
    // Swipe Left (Go to Past/Prev)
    else if (offset.x < -threshold || velocity.x < -velocityThreshold) {
      // Animate content to Left (showing what's on the right)
      await controls.start({ x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } });
      onChange(currentIndex - 1); // -1 is Past
      controls.set({ x: "0%" });
    } 
    // Snap back
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
        style={{ x: "0%", touchAction: "pan-y" }} 
        className="flex h-full w-full absolute top-0 left-0"
      >
        {/* RTL LAYOUT: [Future] [Current] [Past] */}
        
        {/* Future/Next Panel (Left side in RTL) */}
        <div className="absolute top-0 left-[-100%] w-full h-full border-r border-white/5">
          {renderItem(1)}
        </div>

        {/* Current Panel */}
        <div className="absolute top-0 left-0 w-full h-full border-r border-white/5">
          {renderItem(0)}
        </div>

        {/* Past/Prev Panel (Right side in RTL) */}
        <div className="absolute top-0 left-[100%] w-full h-full">
          {renderItem(-1)}
        </div>
      </motion.div>
    </div>
  );
}