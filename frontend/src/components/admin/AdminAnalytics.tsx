"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { BarChart2, Activity, Users } from "lucide-react";

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get("/analytics/stats?days=7").then(res => res.data),
  });

  if (isLoading) return (
      <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-white/10 rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-white/5 rounded-2xl"></div>
              <div className="h-64 bg-white/5 rounded-2xl"></div>
          </div>
      </div>
  );

  const { dau = [], actions = [] } = data || {};
  
  const maxDau = Math.max(...dau.map((d: any) => d.count), 1);
  const maxActions = Math.max(...actions.map((a: any) => a.count), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
          <Activity size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">آمار عملکرد سامانه</h2>
          <p className="text-sm text-gray-400">گزارش استفاده در ۷ روز گذشته</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DAU Chart */}
        <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2 text-gray-200">
              <Users size={18} className="text-emerald-400"/>
              کاربران فعال روزانه
            </h3>
          </div>
          
          <div className="h-48 flex items-end gap-3 justify-between px-2">
            {dau.map((item: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-2 group flex-1">
                <div 
                  className="w-full bg-emerald-600/40 group-hover:bg-emerald-500 rounded-t-md transition-all relative min-w-[20px] shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  style={{ height: `${(item.count / maxDau) * 100}%` }}
                >
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded whitespace-nowrap z-10">
                    {item.count} کاربر
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 rotate-45 mt-2 origin-left whitespace-nowrap">{item.date.slice(5)}</span>
              </div>
            ))}
            {dau.length === 0 && <div className="text-sm text-gray-500 w-full text-center py-10">داده‌ای یافت نشد</div>}
          </div>
        </div>

        {/* Top Actions */}
        <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2 text-gray-200">
              <BarChart2 size={18} className="text-purple-400"/>
              پرتکرارترین عملیات
            </h3>
          </div>

          <div className="space-y-5">
            {actions.map((item: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                  <span className="font-mono opacity-80">{item.action}</span>
                  <span className="font-bold">{item.count}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full shadow-[0_0_8px_rgba(147,51,234,0.5)]"
                    style={{ width: `${(item.count / maxActions) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {actions.length === 0 && <div className="text-sm text-gray-500 w-full text-center py-10">داده‌ای یافت نشد</div>}
          </div>
        </div>

      </div>
    </div>
  );
}