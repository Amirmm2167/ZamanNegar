"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { 
  Plus, 
  AlertTriangle, 
  Building2, 
  LayoutGrid, 
  CalendarDays, 
  List
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import ViewSwitcher from "@/components/views/shared/ViewSwitcher";
import Link from "next/link";

interface FloatingIslandProps {
  role: string;
  onOpenIssue: () => void;
  onOpenEvent: () => void;
}

export default function FloatingIsland({ role, onOpenIssue, onOpenEvent }: FloatingIslandProps) {
  const { viewMode, setViewMode } = useLayoutStore();
  const [showViewMenu, setShowViewMenu] = useState(false);

  // --- Logic for different roles ---
  const isManager = role === "manager" || role === "superadmin";
  const isViewer = role === "viewer";
  
  // Managers get the "Dynamic Dock"
  // Viewers get the "Simple Pill"
  
  return (
    <>
      {/* The Floating Island Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-full max-w-[350px] pointer-events-none">
        
        {/* View Switcher Popover (Appears above Island) */}
        <AnimatePresence>
          {showViewMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="mb-2 p-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto min-w-[200px]"
            >
             <ViewSwitcher 
                currentView={viewMode} 
                onChange={(v) => { setViewMode(v); setShowViewMenu(false); }} 
                isMobile={true} 
                variant="embedded" // We will update ViewSwitcher to support this 'headless' mode
             />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Glass Pill */}
        <div className="flex items-center gap-1 p-1.5 bg-black/60 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full pointer-events-auto transition-all duration-300">
          
          {/* 1. LEFT ACTION: View Switcher */}
          <button 
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="w-12 h-12 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {viewMode === 'agenda' ? <List size={22} /> : <LayoutGrid size={22} />}
          </button>

          {/* 2. CENTER ACTION: Contextual */}
          {isViewer ? (
             // Viewers don't have a center button, or we use it for "Today"
             <div className="w-8" /> 
          ) : (
            <button
              onClick={onOpenEvent}
              className="w-14 h-14 -mt-4 mb-1 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)] border border-white/20 hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus size={28} />
            </button>
          )}

          {/* 3. RIGHT ACTION: Manager vs Others */}
          {isManager ? (
            <Link href="/company-panel">
               <button className="w-12 h-12 flex items-center justify-center rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors">
                  <Building2 size={22} />
               </button>
            </Link>
          ) : (
            <button 
              onClick={onOpenIssue}
              className="w-12 h-12 flex items-center justify-center rounded-full text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
            >
              <AlertTriangle size={22} />
            </button>
          )}

        </div>
      </div>
    </>
  );
}