"use client";

import { useEffect, useState } from "react";
import { motion, PanInfo, useAnimation, AnimatePresence, Variants } from "framer-motion"; // Added Variants
import clsx from "clsx";
import { ChevronUp, Minus } from "lucide-react";

interface ExpandableBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  mode: "view" | "edit";
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}

export default function ExpandableBottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  mode,
  isExpanded,
  onExpandChange
}: ExpandableBottomSheetProps) {
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);

  // We use Y translation to control visibility:
  // 0% = Fully Expanded (Fullscreen)
  // 65% = Collapsed (Summary View - showing bottom 35%)
  // 100% = Closed (Off screen)
  const variants: Variants = { // Explicitly typed as Variants
    expanded: { y: "0%", transition: { type: "spring", damping: 25, stiffness: 200 } },
    collapsed: { y: "65%", transition: { type: "spring", damping: 25, stiffness: 200 } },
    hidden: { y: "100%", transition: { type: "spring", damping: 25, stiffness: 200 } },
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      controls.start(isExpanded ? "expanded" : "collapsed");
    } else {
      document.body.style.overflow = "";
      controls.start("hidden");
    }
  }, [isOpen, isExpanded, controls]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const { offset, velocity } = info;
    const threshold = 100;
    const velocityThreshold = 200;

    // 1. Dragging UP (Negative Y)
    if (offset.y < -threshold || velocity.y < -velocityThreshold) {
      if (!isExpanded) {
        onExpandChange(true); // Snap to Full
      }
    } 
    // 2. Dragging DOWN (Positive Y)
    else if (offset.y > threshold || velocity.y > velocityThreshold) {
      if (isExpanded) {
        onExpandChange(false); // Snap to Summary
      } else {
        onClose(); // Close completely
      }
    }
    // 3. Not enough movement - snap back to current state
    else {
      controls.start(isExpanded ? "expanded" : "collapsed");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }} // We handle movement via logic, constraints just add resistance
            dragElastic={0.2} // Rubber banding effect
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            variants={variants}
            initial="hidden"
            animate={controls}
            exit="hidden"
            className={clsx(
              "fixed bottom-0 left-0 right-0 z-[10000] h-[100dvh] bg-[#1e1e1e] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden border-t border-white/10"
            )}
          >
            {/* Handle & Visual Cue */}
            <div className="w-full flex flex-col items-center pt-3 pb-2 bg-white/5 border-b border-white/5 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-2" />
              
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-blue-400 animate-pulse">
                {!isExpanded ? (
                    <>
                        <ChevronUp size={12} />
                        <span>برای {mode === "edit" ? "ویرایش" : "مشاهده"} بالا بکشید</span>
                    </>
                ) : (
                    <div className="flex items-center gap-1 text-gray-500">
                        <Minus size={12} />
                        <span>پایین بکشید تا کوچک شود</span>
                    </div>
                )}
              </div>
            </div>

            {/* Content - Disable internal scroll while dragging the sheet to prevent conflict */}
            <div className={clsx("flex-1 overflow-y-auto custom-scrollbar bg-[#121212]", isDragging && "overflow-hidden pointer-events-none")}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}