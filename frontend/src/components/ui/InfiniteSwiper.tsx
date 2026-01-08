"use client";

import { useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { 
  motion, 
  useMotionValue, 
  animate, 
  PanInfo, 
  useMotionValueEvent 
} from "framer-motion";

interface InfiniteSwiperProps {
  currentIndex: number;
  onChange: (newIndex: number) => void;
  renderItem: (offset: number) => ReactNode;
}

export default function InfiniteSwiper({ currentIndex, onChange, renderItem }: InfiniteSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  // 1. Measure Width on Mount/Resize
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // 2. Handle Swipe End
  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    
    const { offset, velocity } = info;
    const swipeThreshold = width * 0.25; // 25% width to trigger
    const swipePower = Math.abs(offset.x) * velocity.x;

    // RTL Physics:
    // Dragging RIGHT (Positive X) -> Moving to Right Buffer -> Showing PREVIOUS item
    // Dragging LEFT (Negative X) -> Moving to Left Buffer -> Showing NEXT item
    
    let targetX = 0;
    let indexChange = 0;

    if (offset.x > swipeThreshold || swipePower > 10000) {
      // Swiped Right -> Go to Prev
      targetX = width;
      indexChange = 1;
    } else if (offset.x < -swipeThreshold || swipePower < -10000) {
      // Swiped Left -> Go to Next
      targetX = -width;
      indexChange = -1;
    }

    // Animate to snap point
    const transition = { type: "spring", stiffness: 400, damping: 40 };
    
    animate(x, targetX, transition).then(() => {
      if (indexChange !== 0) {
        // THE MAGIC TRICK:
        // 1. Fire the change (React renders new content in the center)
        onChange(currentIndex + indexChange);
        // 2. Instantly reset X to 0 (Teleport) so the new center is visible
        x.set(0);
      }
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-hidden relative"
      // Critical: Allows vertical scroll to pass through when not swiping horizontally
      style={{ touchAction: "pan-y" }} 
    >
      <motion.div
        className="flex h-full absolute top-0 right-0"
        style={{ 
          x, 
          width: width * 3, // 3 Panels wide
          right: -width,    // Center the middle panel initially (RTL alignment)
        }}
        drag="x"
        dragDirectionLock // Locks horizontal drag so you don't scroll vertically by accident
        dragConstraints={{ left: -width, right: width }} // Rubber band limits
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {/* VIRTUAL BUFFER LAYOUT (RTL)
           [ Next Day (Left) ]  [ Current Day (Center) ]  [ Prev Day (Right) ]
           
           We render them in standard flex row order:
           1. Rightmost (because absolute right:0 + flex row): Prev Day (-1)
           2. Center: Current Day (0)
           3. Leftmost: Next Day (1)
        */}

        {/* Panel 3: Left (Next Day in RTL) */}
        <div className="w-[33.33%] h-full shrink-0 relative" aria-hidden="true">
           {width > 0 && renderItem(-1)}
        </div>

        {/* Panel 2: Center (Current Day) */}
        <div className="w-[33.33%] h-full shrink-0 relative">
           {width > 0 && renderItem(0)}
        </div>

        {/* Panel 1: Right (Prev Day in RTL) */}
        <div className="w-[33.33%] h-full shrink-0 relative" aria-hidden="true">
           {width > 0 && renderItem(1)}
        </div>

      </motion.div>
    </div>
  );
}