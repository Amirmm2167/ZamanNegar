"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { 
  motion, 
  useMotionValue, 
  animate, 
  PanInfo,
  ValueAnimationTransition 
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
    const swipeThreshold = width * 0.25;
    const swipePower = Math.abs(offset.x) * velocity.x;

    let targetX = 0;
    let indexChange = 0;

    // Logic: Swipe Left (< 0) -> Next | Swipe Right (> 0) -> Prev
    if (offset.x > swipeThreshold || swipePower > 10000) {
      targetX = width;
      indexChange = 1;
    } else if (offset.x < -swipeThreshold || swipePower < -10000) {
      targetX = -width;
      indexChange = -1;
    }

    // Fix: Explicitly type the transition or cast if needed
    // Framer Motion 'animate' on a MotionValue expects (value, to, transition)
    animate(x, targetX, { 
      type: "spring", 
      stiffness: 300, 
      damping: 30,
      onComplete: () => {
        if (indexChange !== 0) {
          onChange(currentIndex + indexChange);
          x.set(0); // Teleport back to 0
        }
      }
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-hidden relative"
      style={{ touchAction: "pan-y" }} 
    >
      <motion.div
        className="flex h-full absolute top-0 right-0"
        style={{ 
          x, 
          width: width * 3, 
          right: -width, 
        }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -width, right: width }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <div className="w-[33.33%] h-full shrink-0 relative">
           {width > 0 && renderItem(-1)}
        </div>
        <div className="w-[33.33%] h-full shrink-0 relative">
           {width > 0 && renderItem(0)}
        </div>
        <div className="w-[33.33%] h-full shrink-0 relative">
           {width > 0 && renderItem(1)}
        </div>
      </motion.div>
    </div>
  );
}