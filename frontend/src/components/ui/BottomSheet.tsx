"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = "hidden"; // Prevent background scroll
    } else {
      const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-end sm:items-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className={clsx(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div 
        className={clsx(
          "w-full sm:max-w-md bg-[#1e1e1e] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto flex flex-col max-h-[85vh]",
          isOpen ? "translate-y-0" : "translate-y-full sm:translate-y-10 sm:opacity-0"
        )}
      >
        {/* Drag Handle (Mobile Visual Cue) */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-sm font-bold text-gray-200">{title || "گزینه‌ها"}</h3>
          <button onClick={onClose} className="p-1.5 bg-white/5 rounded-full text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {children}
        </div>
      </div>
    </div>
  );
}