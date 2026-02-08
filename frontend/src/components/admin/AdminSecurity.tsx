"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ShieldAlert, Smartphone, Monitor, Globe, Clock, Trash2 } from "lucide-react";

export default function AdminSecurity() {
  // Assuming backend adds /analytics/sessions endpoint or similar
  // For now we mock based on the 'profiling' data we saw in AdminAnalytics
  const { data: users = [] } = useQuery({
    queryKey: ['admin-profiling'],
    queryFn: () => api.get("/analytics/users/profiling").then(res => res.data) 
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">امنیت و نشست‌ها</h2>
          <p className="text-sm text-gray-400">مدیریت دستگاه‌های متصل و موقعیت‌های مکانی</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Fake Map / Geo View */}
         <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5 h-[300px] flex flex-col items-center justify-center text-gray-500 relative overflow-hidden group">
            <Globe size={64} className="opacity-20 mb-4" />
            <p>نقشه پراکندگی کاربران (Geo-IP)</p>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-xs text-white">تهران: ۴۵۰ | اصفهان: ۱۲۰ | مشهد: ۸۰</span>
            </div>
         </div>

         {/* Active Sessions List (Mocked Visualization) */}
         <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
               <h3 className="font-bold text-white text-sm">آخرین نشست‌های فعال</h3>
            </div>
            <div className="divide-y divide-white/5 max-h-[250px] overflow-y-auto custom-scrollbar">
               {users.slice(0, 10).map((u: any, i: number) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                     <div className="flex items-center gap-3">
                        <div className="bg-gray-800 p-2 rounded-lg">
                           {i % 2 === 0 ? <Monitor size={16} className="text-blue-400"/> : <Smartphone size={16} className="text-green-400"/>}
                        </div>
                        <div>
                           <div className="text-white text-xs font-bold">{u.username}</div>
                           <div className="text-[10px] text-gray-500 flex gap-2">
                              <span>IP: 192.168.1.{i}</span>
                              <span>•</span>
                              <span>{i % 2 === 0 ? "Chrome / Windows" : "Safari / iPhone"}</span>
                           </div>
                        </div>
                     </div>
                     <button className="text-red-400 hover:bg-red-900/20 p-2 rounded transition-colors" title="قطع دسترسی">
                        <Trash2 size={14} />
                     </button>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}