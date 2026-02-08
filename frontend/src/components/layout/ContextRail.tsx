"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";
import { Bell, Clock, AlertCircle } from "lucide-react";

export default function ContextRail() {
  const { isContextRailOpen } = useLayoutStore();
  const { currentRole, user } = useAuthStore();
  const role = currentRole();

  if (!isContextRailOpen) return null;

  return (
    <div className="hidden lg:flex w-[300px] h-screen fixed left-0 top-0 border-r border-white/5 bg-[#0a0c10]/80 backdrop-blur-md z-40 flex-col p-4">
      
      {/* Header: User Info */}
      <div className="flex items-center gap-3 mb-8 p-3 bg-white/5 rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
          {user?.display_name?.charAt(0) || "U"}
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{user?.display_name}</h3>
          <p className="text-xs text-gray-400 capitalize">{role}</p>
        </div>
        <button className="mr-auto p-2 hover:bg-white/10 rounded-full text-gray-400 relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </button>
      </div>

      {/* Dynamic Content based on Role */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
        
        {/* Section 1: Manager Approvals */}
        {(role === 'manager' || role === 'evaluator') && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
              در انتظار تایید
            </h4>
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 group cursor-pointer hover:bg-orange-500/20 transition-all">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-xs text-orange-300 font-mono">10:30</span>
                 <AlertCircle size={14} className="text-orange-400" />
               </div>
               <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                 جلسه بررسی بودجه ۱۴۰۵
               </p>
               <p className="text-xs text-gray-500 mt-1">واحد مالی • دکتر راد</p>
            </div>
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