"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { BarChart2, Activity, Users, Database, AlertCircle } from "lucide-react";
import SmartChart from "@/components/ui/SmartChart"; // Assuming it exists from context

export default function AdminAnalyticsPage() {
  const { data: systemData } = useQuery({
    queryKey: ['admin', 'system_stats'],
    queryFn: () => api.get("/analytics/system").then(res => res.data),
  });

  const { data: healthData } = useQuery({
    queryKey: ['admin', 'health_stats'],
    queryFn: () => api.get("/analytics/health").then(res => res.data),
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">گزارشات سیستم</h1>
          <p className="text-sm text-gray-400">وضعیت سلامت و آمار کلی سامانه</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20 flex items-center gap-2">
              <Activity size={14} /> سیستم آنلاین
           </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-[#1a1d24]/50 p-5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Database size={20} /></div>
               <span className="text-xs text-gray-500">مجموع رکوردها</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{systemData?.db_row_count || 0}</div>
            <div className="text-xs text-gray-400">لاگ ثبت شده</div>
         </div>

         <div className="bg-[#1a1d24]/50 p-5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><Users size={20} /></div>
               <span className="text-xs text-gray-500">کاربران</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
               {systemData?.user_demographics?.reduce((a:any,b:any) => a + b.count, 0) || 0}
            </div>
            <div className="text-xs text-gray-400">کاربر فعال در سیستم</div>
         </div>

         <div className="bg-[#1a1d24]/50 p-5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><AlertCircle size={20} /></div>
               <span className="text-xs text-gray-500">نرخ خطا (۲۴س)</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{healthData?.error_rate || 0}%</div>
            <div className="text-xs text-gray-400">{healthData?.active_alerts || 0} خطای ثبت شده</div>
         </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-[#1a1d24]/50 p-6 rounded-2xl border border-white/5 h-[300px]">
            <h3 className="text-sm font-bold text-white mb-6">توزیع رویدادها بر اساس دپارتمان</h3>
            {systemData && (
                <SmartChart 
                   type="bar" 
                   data={systemData.events_distribution.map((d:any) => ({ name: d.name, value: d.count }))} 
                   height={220}
                   colors={['#3b82f6']}
                />
            )}
         </div>
         <div className="bg-[#1a1d24]/50 p-6 rounded-2xl border border-white/5 h-[300px]">
            <h3 className="text-sm font-bold text-white mb-6">دموگرافی کاربران</h3>
            {systemData && (
                <SmartChart 
                   type="pie" 
                   data={systemData.user_demographics.map((d:any) => ({ name: d.role, value: d.count }))} 
                   height={220}
                   colors={['#8b5cf6', '#ec4899', '#10b981', '#f59e0b']}
                />
            )}
         </div>
      </div>
    </div>
  );
}