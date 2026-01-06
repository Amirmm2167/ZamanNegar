"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { BarChart2, Activity, Users } from "lucide-react";

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get("/analytics/stats?days=7").then(res => res.data),
  });

  if (isLoading) return <div className="text-gray-400 p-10 text-center animate-pulse">در حال بارگذاری آمار...</div>;

  const { dau, actions } = data || { dau: [], actions: [] };
  
  // Calculate max for scaling bars
  const maxDau = Math.max(...dau.map((d: any) => d.count), 1);
  const maxActions = Math.max(...actions.map((a: any) => a.count), 1);

  return (
    <div className="space-y-8">
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
        <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <Users size={18} className="text-emerald-400"/>
              کاربران فعال روزانه
            </h3>
          </div>
          
          <div className="h-48 flex items-end gap-2 justify-between px-2">
            {dau.map((item: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-2 group flex-1">
                <div 
                  className="w-full bg-emerald-600/50 group-hover:bg-emerald-500 rounded-t-md transition-all relative min-w-[20px]"
                  style={{ height: `${(item.count / maxDau) * 100}%` }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded">
                    {item.count}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 rotate-45 mt-2 origin-left">{item.date.slice(5)}</span>
              </div>
            ))}
            {dau.length === 0 && <div className="text-sm text-gray-500 w-full text-center">داده‌ای یافت نشد</div>}
          </div>
        </div>

        {/* Top Actions */}
        <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <BarChart2 size={18} className="text-purple-400"/>
              پرتکرارترین عملیات
            </h3>
          </div>

          <div className="space-y-4">
            {actions.map((item: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>{item.action}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${(item.count / maxActions) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {actions.length === 0 && <div className="text-sm text-gray-500 w-full text-center">داده‌ای یافت نشد</div>}
          </div>
        </div>

      </div>
    </div>
  );
}