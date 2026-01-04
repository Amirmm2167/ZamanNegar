"use client";

import { useEffect, useState, useRef } from "react";
import clsx from "clsx";
import { ChevronUp, Minus } from "lucide-react";

interface ExpandableBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  mode: "view" | "edit"; // Determines the helper text
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
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // --- Gesture Logic ---
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const delta = startY.current - currentY.current;
    
    // Simple resistance logic could go here, 
    // but we'll rely on TouchEnd for the trigger to keep it performant
  };

  const handleTouchEnd = () => {
    const delta = startY.current - currentY.current;
    const threshold = 50;

    if (delta > threshold && !isExpanded) {
      // Swiped UP -> Expand
      onExpandChange(true);
    } else if (delta < -threshold && isExpanded) {
      // Swiped DOWN from full -> Collapse
      onExpandChange(false);
    } else if (delta < -threshold && !isExpanded) {
      // Swiped DOWN from summary -> Close
      onClose();
    }
  };

  if (!visible && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className={clsx(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div 
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={clsx(
          "w-full bg-[#1e1e1e] border-t border-white/10 rounded-t-2xl shadow-2xl transition-all duration-300 ease-out pointer-events-auto flex flex-col overflow-hidden",
          isOpen ? "translate-y-0" : "translate-y-full",
          // Height Logic: Summary (~35%) vs Fullscreen (100%)
          isExpanded ? "h-[100dvh]" : "h-[35dvh]"
        )}
      >
        {/* Handle & Helper Text */}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212]">
          {children}
        </div>
      </div>
    </div>
  );
}