"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
    Activity, Layers, Terminal, Database, Users, 
    BarChart2, RefreshCw, Smartphone, Monitor, AlertTriangle
} from "lucide-react";
import clsx from "clsx";
import SmartTable, { Column } from "@/components/ui/SmartTable";

export default function AdminAnalytics() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'logs' | 'archive'>('overview');
  
  // --- QUERIES ---
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get("/analytics/stats?days=7").then(res => res.data) });
  const { data: system } = useQuery({ queryKey: ['admin-system'], queryFn: () => api.get("/analytics/system").then(res => res.data) });
  const { data: profiling = [] } = useQuery({ queryKey: ['admin-profiling'], queryFn: () => api.get("/analytics/users/profiling").then(res => res.data) });
  const { data: archives = [] } = useQuery({ queryKey: ['admin-archives'], queryFn: () => api.get("/analytics/archives").then(res => res.data) });
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.get("/analytics/logs?limit=200").then(res => res.data),
    refetchInterval: 5000 
  });

  const archiveMutation = useMutation({
      mutationFn: () => api.post("/analytics/archive?days=30"),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['admin-archives'] });
          alert("بایگانی با موفقیت انجام شد.");
      }
  });

  // --- OVERVIEW CHARTS DATA ---
  const { dau = [], actions = [] } = stats || {};
  const maxDau = Math.max(...dau.map((d: any) => d.count), 1);
  const maxActions = Math.max(...actions.map((a: any) => a.count), 1);

  // --- COLUMNS CONFIG ---
  const logColumns: Column<any>[] = [
      { key: 'id', label: 'ID', width: 'w-16' },
      { key: 'created_at', label: 'زمان', width: 'w-24', render: (l) => <span className="font-mono">{new Date(l.created_at).toLocaleTimeString()}</span> },
      { key: 'event_type', label: 'نوع', width: 'w-24', render: (l) => (
          <span className={clsx("font-bold text-[10px]", l.event_type === 'ERROR' ? "text-red-400" : "text-blue-300")}>{l.event_type}</span>
      )},
      { key: 'details', label: 'جزئیات', render: (l) => <span className="font-mono opacity-70 truncate block max-w-md">{l.details}</span> }
  ];

  const userColumns: Column<any>[] = [
      { key: 'name', label: 'نام نمایشی' },
      { key: 'username', label: 'نام کاربری', render: (u) => <span className="font-mono text-xs">{u.username}</span> },
      { key: 'role', label: 'نقش', width: 'w-24', render: (u) => <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{u.role}</span> },
      { key: 'total_actions', label: 'فعالیت‌ها', width: 'w-24', render: (u) => <span className="text-emerald-400 font-bold">{u.total_actions}</span> },
      { key: 'last_active', label: 'آخرین بازدید', render: (u) => u.last_active ? new Date(u.last_active).toLocaleDateString('fa-IR') : '-' },
      { key: 'status', label: 'وضعیت', width: 'w-24', render: (u) => (
          <div className="flex items-center gap-1">
              <span className={clsx("w-2 h-2 rounded-full", u.status === 'Active' ? "bg-emerald-500" : "bg-gray-500")}></span>
              <span>{u.status === 'Active' ? 'فعال' : 'غیرفعال'}</span>
          </div>
      )},
  ];

  const archiveColumns: Column<any>[] = [
      { key: 'filename', label: 'نام فایل', render: (f) => <span className="font-mono ltr">{f.filename}</span> },
      { key: 'size_kb', label: 'حجم (KB)', width: 'w-24', render: (f) => <span className="text-emerald-400 font-mono">{f.size_kb}</span> },
      { key: 'created_at', label: 'تاریخ ایجاد', width: 'w-32', render: (f) => new Date(f.created_at).toLocaleString('fa-IR') },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="text-blue-400" />
                مرکز کنترل (Mission Control)
            </h2>
        </div>

        <div className="bg-white/5 p-1 rounded-xl flex items-center gap-1 overflow-x-auto">
            {[
                { id: 'overview', label: 'نمای کلی', icon: BarChart2 },
                { id: 'users', label: 'اطلاعات کاربران', icon: Users },
                { id: 'system', label: 'وضعیت سیستم', icon: Layers },
                { id: 'logs', label: 'ترمینال', icon: Terminal },
                { id: 'archive', label: 'بایگانی', icon: Database },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={clsx(
                        "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap",
                        activeTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <tab.icon size={14} />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* --- CONTENT AREA (FILLS REMAINING HEIGHT) --- */}
      <div className="flex-1 overflow-hidden relative">
      
        {/* 1. OVERVIEW */}
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-y-auto pb-20 custom-scrollbar">
                <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-lg h-80">
                    <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-6">
                        <Users size={18} className="text-emerald-400"/> کاربران فعال (DAU)
                    </h3>
                    <div className="h-48 flex items-end gap-2 px-2 border-b border-white/5 pb-2">
                        {dau.map((item: any, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                            <div className="w-full bg-emerald-600/40 group-hover:bg-emerald-500 rounded-t-md relative min-w-[10px]" style={{ height: `${(item.count / maxDau) * 100}%` }}></div>
                            <span className="text-[10px] text-gray-500 rotate-45 mt-2 origin-left whitespace-nowrap">{item.date.slice(5)}</span>
                        </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-lg h-80">
                    <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-6">
                        <BarChart2 size={18} className="text-purple-400"/> محبوب‌ترین عملیات‌ها
                    </h3>
                    <div className="space-y-4 overflow-y-auto h-52 custom-scrollbar">
                        {actions.map((item: any, i: number) => (
                        <div key={i}>
                            <div className="flex justify-between text-xs text-gray-300 mb-1">
                                <span>{item.action}</span>
                                <span>{item.count}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${(item.count / maxActions) * 100}%` }} />
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* 2. USERS TABLE */}
        {activeTab === 'users' && (
            <SmartTable 
                title="جدول تحلیل کاربران" 
                data={profiling} 
                columns={userColumns} 
                icon={Users} 
            />
        )}

        {/* 3. SYSTEM STATS */}
        {activeTab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <SmartTable 
                    title="آمار دپارتمان‌ها" 
                    data={system?.events_distribution || []} 
                    columns={[
                        { key: 'name', label: 'دپارتمان' }, 
                        { key: 'count', label: 'تعداد رویداد', render: (d) => <span className="font-bold text-lg">{d.count}</span> }
                    ]} 
                    icon={Layers} 
                />
                <SmartTable 
                    title="توزیع نقش‌ها" 
                    data={system?.user_demographics || []} 
                    columns={[
                        { key: 'role', label: 'نقش کاربری' }, 
                        { key: 'count', label: 'تعداد کاربر', render: (u) => <span className="bg-blue-500/20 px-3 py-1 rounded text-blue-300 font-bold">{u.count}</span> }
                    ]} 
                    icon={Users} 
                />
            </div>
        )}

        {/* 4. LIVE LOGS */}
        {activeTab === 'logs' && (
            <SmartTable 
                title="ترمینال زنده (آخرین ۲۰۰ رکورد)" 
                data={logs} 
                columns={logColumns} 
                icon={Terminal}
                rowClassName={(l) => l.event_type === 'ERROR' ? "bg-red-500/5 hover:bg-red-500/10" : ""}
            />
        )}

        {/* 5. ARCHIVES */}
        {activeTab === 'archive' && (
            <div className="flex flex-col h-full gap-4">
                 <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 text-orange-400">
                        <AlertTriangle />
                        <div>
                            <h4 className="font-bold text-sm">مدیریت فضای دیتابیس</h4>
                            <p className="text-xs opacity-80">انتقال لاگ‌های قدیمی به فایل فشرده جهت کاهش حجم دیتابیس</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => archiveMutation.mutate()}
                        disabled={archiveMutation.isPending}
                        className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                    >
                        {archiveMutation.isPending ? <RefreshCw className="animate-spin" size={14}/> : <Database size={14}/>}
                        بایگانی و پاکسازی
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-hidden">
                    <SmartTable 
                        title="فایل‌های بایگانی شده (Cold Storage)" 
                        data={archives} 
                        columns={archiveColumns} 
                        icon={Database} 
                    />
                 </div>
            </div>
        )}

      </div>
    </div>
  );
}