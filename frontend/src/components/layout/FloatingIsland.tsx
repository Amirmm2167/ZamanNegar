"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { Plus, List, LayoutGrid, AlertTriangle, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
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
  const isManager = role === "manager" || role === "superadmin";

  return (
    // Z-Index 30 allows Sidebar (Z-40/50) to overlap this
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 w-auto pointer-events-none">
        
        {/* Popover Menu */}
        <AnimatePresence>
          {showViewMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              className="p-2 bg-[#18181b]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto mb-2 origin-bottom"
            >
             <ViewSwitcher 
                currentView={viewMode} 
                onChange={(v) => { setViewMode(v); setShowViewMenu(false); }} 
                isMobile={true} 
                variant="embedded" 
             />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Pill */}
        <motion.div 
           className="flex items-center gap-1 p-2 bg-[#09090b]/80 backdrop-blur-xl backdrop-saturate-150 border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] rounded-full pointer-events-auto"
           layout
        >
          {/* View Switcher */}
          <button 
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="w-12 h-12 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {viewMode === 'agenda' ? <List size={22} /> : <LayoutGrid size={22} />}
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Add Event (Primary) */}
          <button
             onClick={onOpenEvent}
             className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-2 border-[#09090b]"
          >
             <Plus size={28} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Contextual Action */}
          {isManager ? (
            <Link href="/company-panel">
               <button className="w-12 h-12 flex items-center justify-center rounded-full text-emerald-400 hover:text-white hover:bg-emerald-500/10 transition-colors">
                  <Building2 size={22} />
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