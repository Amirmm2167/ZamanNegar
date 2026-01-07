"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { BarChart2, Activity, Users, AlertOctagon, Terminal } from "lucide-react";
import clsx from "clsx";

export default function AdminAnalytics() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get("/analytics/stats?days=7").then(res => res.data),
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => api.get("/analytics/health").then(res => res.data),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.get("/analytics/logs?limit=20").then(res => res.data),
    refetchInterval: 5000 // Auto-refresh logs every 5s
  });

  if (statsLoading || healthLoading) return <div className="text-gray-400 p-10 text-center animate-pulse">در حال بارگذاری آمار...</div>;

  const { dau = [], actions = [] } = stats || {};
  const maxDau = Math.max(...dau.map((d: any) => d.count), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Health Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#1e1e1e] p-4 rounded-xl border border-white/5 flex flex-col gap-2">
              <span className="text-xs text-gray-400">نرخ خطا (۲۴س)</span>
              <div className="flex items-end gap-2">
                  <span className={clsx("text-2xl font-bold", (health?.error_rate || 0) > 5 ? "text-red-500" : "text-emerald-500")}>
                      {health?.error_rate}%
                  </span>
                  <Activity size={16} className="text-gray-600 mb-1" />
              </div>
          </div>
          <div className="bg-[#1e1e1e] p-4 rounded-xl border border-white/5 flex flex-col gap-2">
              <span className="text-xs text-gray-400">کل درخواست‌ها</span>
              <span className="text-2xl font-bold text-white">{health?.total_requests}</span>
          </div>
      </div>

      {/* 2. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Chart */}
        <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-lg">
          <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-6">
              <Users size={18} className="text-emerald-400"/> کاربران فعال روزانه
          </h3>
          <div className="h-48 flex items-end gap-2 px-2">
            {dau.map((item: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                <div 
                  className="w-full bg-emerald-600/40 group-hover:bg-emerald-500 rounded-t-md transition-all relative min-w-[10px]"
                  style={{ height: `${(item.count / maxDau) * 100}%` }}
                >
                   <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-black px-1 rounded opacity-0 group-hover:opacity-100">{item.count}</span>
                </div>
                <span className="text-[9px] text-gray-500 rotate-45 mt-2">{item.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Logs */}
        <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-lg flex flex-col">
          <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-4">
              <Terminal size={18} className="text-blue-400"/> گزارشات زنده (Live)
          </h3>
          <div className="flex-1 overflow-y-auto max-h-[200px] space-y-2 pr-2 custom-scrollbar bg-black/20 p-2 rounded-lg font-mono text-xs">
              {logs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 border-b border-white/5 pb-1">
                      <span className="text-gray-500 shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                      <span className={clsx("font-bold shrink-0 w-16", log.event_type === 'ERROR' ? "text-red-400" : "text-blue-300")}>
                          {log.event_type}
                      </span>
                      <span className="text-gray-300 truncate">{log.details || "-"}</span>
                  </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}