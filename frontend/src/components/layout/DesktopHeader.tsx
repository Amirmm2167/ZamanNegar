"use client";

import { useHeaderLogic } from "@/hooks/useHeaderLogic";
import { ViewMode } from "@/stores/layoutStore";
import { 
  ChevronRight, ChevronLeft, Search, RefreshCw,
  Calendar, Grid3X3, Layers, List
} from "lucide-react";
import clsx from "clsx";
import NotificationBell from "./NotificationBell"; // <--- INTEGRATED

export default function DesktopHeader() {
  const { 
    title, 
    viewMode, 
    setViewMode, 
    handleNav, 
    jumpToToday, 
    handleHardRefresh, 
    isRefreshing 
  } = useHeaderLogic();

  const desktopViews: { id: ViewMode; label: string; icon: any }[] = [
    { id: 'agenda', label: 'برنامه', icon: List },
    { id: 'week',   label: 'هفته',   icon: Layers },
    { id: 'month',  label: 'ماه',    icon: Grid3X3 },
    { id: 'year',   label: 'سال',    icon: Calendar },
  ];

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#0a0c10]/50 backdrop-blur-md z-40 shrink-0 gap-4 select-none">
      
      {/* Left: Navigation Controls */}
      <div className="flex items-center gap-4">
         <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
            <button 
               onClick={() => handleNav(-1)} 
               className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
               title="قبلی"
            >
               <ChevronRight size={18} />
            </button>
            <button 
               onClick={jumpToToday}
               className="px-3 py-1 text-xs font-bold text-gray-300 hover:text-white transition-colors"
            >
               امروز
            </button>
            <button 
               onClick={() => handleNav(1)}
               className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
               title="بعدی"
            >
               <ChevronLeft size={18} />
            </button>
         </div>

         <h2 className="text-lg font-bold text-gray-100 min-w-[120px] tabular-nums cursor-default">
            {title}
         </h2>
      </div>

      {/* Center: Omni-Search */}
      <div className="flex-1 max-w-xl mx-auto">
         <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input 
               type="text" 
               placeholder="جستجو در رویدادها، افراد و جلسات... (Ctrl + K)"
               className="w-full bg-[#18181b] border border-white/10 rounded-xl py-2 pr-10 pl-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1">
               <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-gray-400 opacity-100">
                  <span className="text-xs">⌘</span>K
               </kbd>
            </div>
         </div>
      </div>

      {/* Right: Actions & Switcher */}
      <div className="flex items-center gap-3">
         
         {/* Desktop View Switcher */}
         <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/5">
            {desktopViews.map((view) => (
               <button
                  key={view.id}
                  onClick={() => setViewMode(view.id)}
                  className={clsx(
                     "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                     viewMode === view.id 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
               >
                  <view.icon size={14} />
                  <span>{view.label}</span>
               </button>
            ))}
         </div>
         
         <div className="h-6 w-px bg-white/10 mx-1" />
         
         <button 
            onClick={handleHardRefresh}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
            title="بروزرسانی کامل (پاکسازی کش)"
         >
            <RefreshCw size={20} className={clsx(isRefreshing && "animate-spin")} />
         </button>

         {/* Native Notification Integration */}
         <NotificationBell isMobile={false} />
         
      </div>

    </header>
  );
}