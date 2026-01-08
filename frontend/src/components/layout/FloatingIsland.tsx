"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { 
  Plus, List, LayoutGrid, AlertTriangle, Building2, 
  CheckSquare, LogOut, User, Calendar, 
  Columns, Trello, CalendarDays // New Icons
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";

interface FloatingIslandProps {
  role: string;
  onOpenIssue: () => void;
  onOpenEvent: () => void;
}

export default function FloatingIsland({ role, onOpenIssue, onOpenEvent }: FloatingIslandProps) {
  const { viewMode, setViewMode } = useLayoutStore();
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  
  const isManager = role === "manager" || role === "superadmin";
  const isEvaluator = role === "evaluator";

  const handleLogout = () => {
    if (confirm("آیا خارج می‌شوید؟")) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        router.push("/login");
    }
  };

  // Explicit View Options
  const viewOptions = [
    { id: '1day', label: 'روزانه', icon: Columns },
    { id: '3day', label: '۳ روزه', icon: Trello }, // Trello icon looks like columns
    { id: 'mobile-week', label: 'هفتگی', icon: CalendarDays },
    { id: 'month', label: 'ماهانه', icon: Calendar },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 w-auto pointer-events-none">
        
        {/* --- SYSTEM MENU POPOVER --- */}
        <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="mb-2 w-72 bg-[#18181b]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col origin-bottom"
            >
               {/* 1. Profile Section */}
               <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                  <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white text-center truncate">نمای تقویم</div>
                  </div>
               </div>

               {/* 2. View Switcher Grid (Manual Implementation) */}
               <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                      {viewOptions.map((opt) => {
                          const isActive = viewMode === opt.id || (viewMode === 'week' && opt.id === 'mobile-week'); // Map 'week' to mobile-week visually
                          return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                    setViewMode(opt.id as any);
                                    setShowMenu(false);
                                }}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-3 rounded-xl transition-all border",
                                    isActive 
                                        ? "bg-blue-600/20 border-blue-600/30 text-blue-400" 
                                        : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                  <opt.icon size={18} />
                                  <span className="text-xs font-medium">{opt.label}</span>
                                  {isActive && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                              </button>
                          );
                      })}
                  </div>
               </div>

               {/* 3. Footer / Logout */}
               <div className="p-2 border-t border-white/5 mt-1 bg-black/20">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                      <LogOut size={16} />
                      <span>خروج از حساب</span>
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- THE PILL --- */}
        <motion.div 
           className="flex items-center gap-1 p-2 bg-[#09090b]/80 backdrop-blur-xl backdrop-saturate-150 border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] rounded-full pointer-events-auto"
           layout
        >
          {/* Left: System Menu Toggle */}
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${showMenu ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            {/* Show 'List' icon for menu, or 'Layout' if preferred */}
            <LayoutGrid size={22} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Center: Add Event (Primary) */}
          <button
             onClick={onOpenEvent}
             className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-2 border-[#09090b]"
          >
             <Plus size={28} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Right: Dynamic Context Button */}
          {isManager ? (
            <Link href="/company-panel">
               <button className="w-12 h-12 flex items-center justify-center rounded-full text-emerald-400 hover:text-white hover:bg-emerald-500/10 transition-colors">
                  <Building2 size={22} />
               </button>
            </Link>
          ) : isEvaluator ? (
            <Link href="/evaluator-panel">
               <button className="w-12 h-12 flex items-center justify-center rounded-full text-purple-400 hover:text-white hover:bg-purple-500/10 transition-colors">
                  <CheckSquare size={22} />
               </button>
            </Link>
          ) : (
             <button 
              onClick={onOpenIssue}
              className="w-12 h-12 flex items-center justify-center rounded-full text-yellow-500 hover:text-white hover:bg-yellow-500/10 transition-colors"
            >
              <AlertTriangle size={22} />
            </button>
          )}

        </motion.div>
    </div>
  );
}