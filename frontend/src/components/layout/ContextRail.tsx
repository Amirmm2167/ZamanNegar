"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";
import { Bell, Clock, AlertCircle, X } from "lucide-react";

export default function ContextRail() {
  // Get toggle function to allow closing
  const { isContextRailOpen, toggleContextRail } = useLayoutStore(); 
  const { currentRole, user } = useAuthStore();
  const role = currentRole();

  if (!isContextRailOpen) return null;

  return (
    <div className="hidden lg:flex w-[300px] h-screen fixed left-0 top-0 border-r border-white/5 bg-[#0a0c10]/95 backdrop-blur-xl z-40 flex-col p-4 shadow-2xl">
      
      {/* Header: User Info & Close Button */}
      <div className="flex items-center justify-between mb-6 p-3 bg-white/5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-inner">
            {user?.display_name?.charAt(0) || "U"}
            </div>
            <div>
            <h3 className="text-sm font-bold text-white truncate max-w-[100px]">{user?.display_name}</h3>
            <p className="text-[10px] text-gray-400 capitalize">{role}</p>
            </div>
        </div>
        
        {/* CLOSE BUTTON */}
        <button 
            onClick={toggleContextRail}
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            title="بستن پنل کناری"
        >
            <X size={18} />
        </button>
      </div>

      {/* Notifications / Alerts */}
      <div className="flex items-center justify-between mb-6 px-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">اعلانات</h4>
          <button className="p-2 hover:bg-white/10 rounded-full text-gray-400 relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </button>
      </div>

      {/* Dynamic Content based on Role */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
        
        {/* Section 1: Manager Approvals */}
        {(role === 'manager' || role === 'evaluator') && (
          <div>
            محل نمایش برنامه ها
          </div>
        )}

        {/* Section 2: Upcoming Events (Everyone) */}
        <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
              رویدادهای امروز
            </h4>
            
            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-8 text-gray-600 border-2 border-dashed border-white/5 rounded-xl">
               <Clock size={24} className="mb-2 opacity-50" />
               <span className="text-xs">رویدادی وجود ندارد</span>
            </div>
        </div>

      </div>
    </div>
  );
}