"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Calendar, List, Smartphone, Monitor, Grid, LayoutGrid } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { ViewMode } from "@/types"; // Import from global types

interface ViewSwitcherProps {
  currentView: ViewMode;
  onChange: (view: ViewMode) => void;
  isMobile: boolean;
  variant?: "default" | "embedded";
}

export default function ViewSwitcher({ currentView, onChange, isMobile, variant = "default" }: ViewSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const desktopViews = [
    { id: "month" as const, label: "ماهانه", icon: Grid },
    { id: "week" as const, label: "هفتگی", icon: Monitor },
    { id: "agenda" as const, label: "برنامه", icon: List },
    // { id: "year" as const, label: "سالانه", icon: Calendar }, // Reserved for Phase 3.4
  ];

  const mobileViews = [
    { id: "1day" as const, label: "روزانه", icon: Smartphone },
    { id: "3day" as const, label: "۳ روزه", icon: Calendar },
    { id: "mobile-week" as const, label: "هفتگی", icon: LayoutGrid },
    { id: "month" as const, label: "ماهانه", icon: Calendar },
    { id: "agenda" as const, label: "برنامه", icon: List },
  ];

  const views = isMobile ? mobileViews : desktopViews;
  const activeView = views.find((v) => v.id === currentView) || views[0];

  useEffect(() => {
    if (variant === "embedded") return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant]);

  // --- MOBILE / EMBEDDED MODE (Dropdown or List) ---
  if (isMobile || variant === "embedded") {
    // 1. Embedded List (e.g. inside a menu)
    if (variant === "embedded") {
      return (
        <div className="flex flex-col gap-1 w-full">
          {mobileViews.map((view) => (
            <button
              key={view.id}
              onClick={() => onChange(view.id)}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-all w-full text-right",
                currentView === view.id
                  ? "bg-blue-600/30 text-blue-400 font-bold border border-blue-500/30"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <view.icon size={18} />
              {view.label}
            </button>
          ))}
        </div>
      );
    }

    // 2. Mobile Dropdown Trigger
    return (
      <div className="relative z-50" ref={containerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-gray-200 transition-all text-xs sm:text-sm font-medium min-w-[110px] justify-between shadow-sm"
        >
          <div className="flex items-center gap-2">
            <activeView.icon size={16} className="text-blue-400" />
            <span>{activeView.label}</span>
          </div>
          <ChevronDown size={14} className={clsx("transition-transform text-gray-500", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-40 bg-[#252526] border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col p-1">
            {mobileViews.map((view) => (
              <button
                key={view.id}
                onClick={() => {
                  onChange(view.id);
                  setIsOpen(false);
                }}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors w-full text-right",
                  currentView === view.id
                    ? "bg-blue-600/20 text-blue-400 font-bold"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <view.icon size={16} />
                {view.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- DESKTOP MODE (Segmented Control) ---
  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-1 rounded-xl flex items-center gap-1 relative h-10">
      {desktopViews.map((view) => {
        const isActive = currentView === view.id;
        return (
          <button
            key={view.id}
            onClick={() => onChange(view.id)}
            className={clsx(
              "relative px-4 h-full rounded-lg text-sm font-medium transition-colors z-10 flex items-center gap-2",
              isActive ? "text-white" : "text-gray-400 hover:text-gray-200"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeViewTab"
                className="absolute inset-0 bg-blue-600/80 rounded-lg shadow-sm -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <view.icon size={14} />
            <span>{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}