"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Calendar, List, Smartphone, Monitor, Grid } from "lucide-react";
import clsx from "clsx";

export type ViewMode = "week" | "3day" | "1day" | "month" | "agenda" | "mobile-week";

interface ViewSwitcherProps {
  currentView: ViewMode;
  onChange: (view: ViewMode) => void;
  isMobile: boolean;
}

export default function ViewSwitcher({ currentView, onChange, isMobile }: ViewSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const desktopViews: { id: ViewMode; label: string; icon: any }[] = [
    { id: "week", label: "هفتگی", icon: Monitor },
    { id: "month", label: "ماهانه", icon: Grid },
    { id: "agenda", label: "برنامه", icon: List },
  ];

  const mobileViews: { id: ViewMode; label: string; icon: any }[] = [
    { id: "1day", label: "روزانه", icon: Smartphone },
    { id: "3day", label: "۳ روزه", icon: Calendar },
    { id: "mobile-week", label: "هفتگی", icon: Grid },
    { id: "month", label: "ماهانه", icon: Calendar }, // Added Month
    { id: "agenda", label: "برنامه", icon: List },
  ];

  const views = isMobile ? mobileViews : desktopViews;
  const activeView = views.find((v) => v.id === currentView) || views[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          {views.map((view) => (
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