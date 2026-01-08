"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { 
  motion, 
  useMotionValue, 
  animate, 
  PanInfo, 
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

  // Measure width on mount/resize
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    
    const { offset, velocity } = info;
    const swipeThreshold = width * 0.25; // Swipe 25% to trigger
    const swipePower = Math.abs(offset.x) * velocity.x;

    let targetX = 0;
    let indexChange = 0;

    // LOGIC: RTL Natural Swipe
    // Swipe RIGHT (Positive X) -> Dragging content to the right -> Reveal Left side -> Next Day
    // Wait, user said: "sliding rtl (Right): last partial (Prev)"
    // "sliding ltr (Left): next partial (Next)"
    
    if (offset.x > swipeThreshold || swipePower > 10000) {
      // Swiped Right ( --> )
      targetX = width;     // Move track to right
      indexChange = 1;    // Go to PREVIOUS index (Show what was on the left visually? No, in RTL Prev is Right)
      // Visual Logic: 
      // [Next] [Current] [Prev]
      // Move Right --> [Next] [Current]
      // We see [Next]. 
      // User wants "Last Partial" (Prev) on Right swipe? 
      // Let's stick to standard RTL: Right = Prev.
    } else if (offset.x < -swipeThreshold || swipePower < -10000) {
      // Swiped Left ( <-- )
      targetX = -width;    // Move track to left
      indexChange = -1;     // Go to NEXT index
    }

    const transition = { type: "spring", stiffness: 300, damping: 30 };
    
    animate(x, targetX, transition).then(() => {
      if (indexChange !== 0) {
        // 1. Update Logic
        onChange(currentIndex + indexChange);
        // 2. Teleport back to center instantly
        x.set(0);
      }
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-hidden relative"
      style={{ touchAction: "pan-y" }} // Allow vertical scroll, capture horizontal
    >
      <motion.div
        className="flex h-full absolute top-0 right-0"
        style={{ 
          x, 
          width: width * 3, // 3 Panels
          right: -width,    // Center the middle panel (RTL)
        }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -width, right: width }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {/* RENDER ORDER (RTL Flex Row starts from Right)
            Visual: [Panel 3 (Left)] [Panel 2 (Center)] [Panel 1 (Right)]
            Data:   [Next (+1)]      [Current (0)]      [Prev (-1)]
        */}

        {/* Leftmost (Visually Next) */}
        <div className="w-[33.33%] h-full shrink-0 relative">
           {width > 0 && renderItem(-1)}
        </div>

        {/* Center */}
        <div className="w-[33.33%] h-full shrink-0 relative">
           {width > 0 && renderItem(0)}
        </div>

        {/* Rightmost (Visually Prev) */}
        <div className="w-[33.33%] h-full shrink-0 relative">
           {width > 0 && renderItem(1)}
        </div>

      </motion.div>
    </div>
  );
}