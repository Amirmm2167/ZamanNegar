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
  const [indexOffset, setIndexOffset] = useState(0); // Used to trigger re-renders if needed, largely internal

  // When the external index changes, we ensure we are visually centered (offset 0)
  // But since we use framer controls, we just reset the X immediately.
  useEffect(() => {
    controls.set({ x: "0%" });
  }, [currentIndex, controls]);

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 100; // px
    const velocityThreshold = 200;

    // We are viewing 3 panels. 
    // -33.33% is "Past", 0% is "Current" (Wait, CSS layout logic below)
    // Actually, in the layout:
    // Left Panel: -100% (relative to container)
    // Center Panel: 0%
    // Right Panel: 100%
    
    // Swipe Right (positive X) -> Go to Past
    if (offset.x > threshold || velocity.x > velocityThreshold) {
      await controls.start({ x: "100%", transition: { type: "spring", stiffness: 300, damping: 30 } });
      onChange(currentIndex - 1);
      controls.set({ x: "0%" }); // Instant reset after state change
    } 
    // Swipe Left (negative X) -> Go to Future
    else if (offset.x < -threshold || velocity.x < -velocityThreshold) {
      await controls.start({ x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } });
      onChange(currentIndex + 1);
      controls.set({ x: "0%" }); // Instant reset after state change
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
        dragConstraints={{ left: 0, right: 0 }} // Constraints 0 makes it "elastic" around the center
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="flex h-full w-full absolute top-0 left-0"
        style={{ x: "0%" }} // Controlled by animation
      >
        {/* Layout Trick:
           We position the panels absolutely so we can slide the container easily.
           Wait, simpler approach for framer motion:
           Render 3 divs side by side: [-100%, 0%, 100%]
        */}
        
        {/* Past Panel (-1) */}
        <div className="absolute top-0 left-[-100%] w-full h-full border-r border-white/5">
          {renderItem(-1)}
        </div>

        {/* Current Panel (0) */}
        <div className="absolute top-0 left-0 w-full h-full border-r border-white/5">
          {renderItem(0)}
        </div>

        {/* Future Panel (+1) */}
        <div className="absolute top-0 left-[100%] w-full h-full">
          {renderItem(1)}
        </div>

      </motion.div>
    </div>
  );
}