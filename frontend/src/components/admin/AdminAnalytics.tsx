"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
    Activity, Layers, Terminal, Database, Users, 
    BarChart2, RefreshCw, Smartphone, AlertTriangle, Wifi, Cpu, History, FileDown, Play
} from "lucide-react";
import clsx from "clsx";
import SmartTable, { Column } from "@/components/ui/SmartTable";
import SmartChart from "@/components/ui/SmartChart"; 
import { motion, AnimatePresence } from "framer-motion";

const JsonTree = ({ data }: { data: any }) => {
    if (typeof data !== 'object' || data === null) return <span className="text-emerald-400">{String(data)}</span>;
    return (
        <div className="pl-4 border-l border-white/10 space-y-1 text-[10px] font-mono">
            {Object.entries(data).map(([k, v]) => (
                <div key={k}>
                    <span className="text-gray-500">{k}:</span> <JsonTree data={v} />
                </div>
            ))}
        </div>
    );
};

export default function AdminAnalytics() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'logs' | 'archive'>('overview');
  
  // --- QUERIES ---
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get("/analytics/stats?days=7").then(res => res.data) });
  const { data: system } = useQuery({ queryKey: ['admin-system'], queryFn: () => api.get("/analytics/system").then(res => res.data) });
  const { data: profiling = [] } = useQuery({ queryKey: ['admin-profiling'], queryFn: () => api.get("/analytics/users/profiling").then(res => res.data) });
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.get("/analytics/logs?limit=200").then(res => res.data),
    refetchInterval: 5000 
  });
  
  const { data: snapshots = [] } = useQuery({ 
      queryKey: ['admin-snapshots'], 
      queryFn: () => api.get("/analytics/snapshots").then(res => res.data) 
  });

  const archiveMutation = useMutation({
      mutationFn: () => api.post("/analytics/archive?days=30"),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['admin-archives'] });
          alert("بایگانی با موفقیت انجام شد.");
      }
  });

  // Manually trigger snapshot for Demo/Testing
  const snapshotMutation = useMutation({
      mutationFn: () => api.post("/analytics/archive?days=0"), // Hack: archiving 0 days effectively snapshots everything
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['admin-snapshots'] });
          alert("Snapshot captured successfully!");
      }
  });

  // --- DERIVED DATA ---
  const { dau = [], actions = [] } = stats || {};
  
  // Transform Snapshots for Timeline Chart
  const timelineData = snapshots.map((s: any) => {
      // Parse timestamp: 20250107_123045
      const p = s.timestamp.split('_');
      const dateStr = `${p[0].slice(0,4)}-${p[0].slice(4,6)}-${p[0].slice(6,8)} ${p[1].slice(0,2)}:${p[1].slice(2,4)}`;
      return {
          date: dateStr,
          total: s.stats.total,
          errors: s.stats.errors
      };
  }).reverse();

  // --- COLUMNS ---
  const logColumns: Column<any>[] = [
      { key: 'id', label: 'ID', width: 'w-16' },
      { key: 'created_at', label: 'زمان', width: 'w-24', sortable: true, render: (l: any) => <span className="font-mono text-[10px]">{new Date(l.created_at).toLocaleTimeString()}</span> },
      { key: 'event_type', label: 'نوع', width: 'w-24', filterable: true, sortable: true, render: (l: any) => (
          <span className={clsx("font-bold text-[10px] px-2 py-0.5 rounded-md", 
            l.event_type === 'ERROR' ? "bg-red-500/10 text-red-400" : 
            l.event_type === 'API_REQ' ? "bg-purple-500/10 text-purple-400" :
            "bg-blue-500/10 text-blue-400"
          )}>{l.event_type}</span>
      )},
      { key: 'details', label: 'جزئیات', render: (l: any) => <span className="font-mono opacity-70 truncate block max-w-md text-[10px]">{l.details}</span> }
  ];

  const userColumns: Column<any>[] = [
      { key: 'name', label: 'نام نمایشی', sortable: true, render: (u: any) => <span className="font-bold text-gray-200">{u.name}</span> },
      { key: 'username', label: 'نام کاربری', sortable: true, render: (u: any) => <span className="font-mono text-xs opacity-80">{u.username}</span> },
      { key: 'role', label: 'نقش', width: 'w-24', filterable: true, render: (u: any) => <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{u.role}</span> },
      { key: 'total_actions', label: 'فعالیت‌ها', width: 'w-24', sortable: true, render: (u: any) => <span className="text-emerald-400 font-bold">{u.total_actions}</span> },
      { key: 'last_active', label: 'آخرین بازدید', sortable: true, render: (u: any) => u.last_active ? <span className="text-xs">{new Date(u.last_active).toLocaleDateString('fa-IR')}</span> : '-' },
      { key: 'status', label: 'وضعیت', width: 'w-24', filterable: true, render: (u: any) => (
          <div className="flex items-center gap-1.5">
              <span className={clsx("w-2 h-2 rounded-full shadow-[0_0_8px]", u.status === 'Active' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-gray-500")}></span>
              <span className="text-[10px]">{u.status === 'Active' ? 'فعال' : 'غیرفعال'}</span>
          </div>
      )},
  ];

  const systemDeptColumns: Column<any>[] = [
     { key: 'name', label: 'دپارتمان', sortable: true }, 
     { key: 'count', label: 'تعداد رویداد', sortable: true, render: (d: any) => <span className="font-bold text-lg text-emerald-400">{d.count}</span> }
  ];

  const systemRoleColumns: Column<any>[] = [
     { key: 'role', label: 'نقش کاربری', sortable: true }, 
     { key: 'count', label: 'تعداد کاربر', sortable: true, render: (u: any) => <span className="bg-blue-500/20 px-3 py-1 rounded text-blue-300 font-bold">{u.count}</span> }
  ];

  const snapshotColumns: Column<any>[] = [
      { key: 'timestamp', label: 'زمان ایجاد', sortable: true, render: (s: any) => {
          const [date, time] = s.timestamp.split('_');
          return <span className="font-mono text-xs">{date.slice(0,4)}/{date.slice(4,6)}/{date.slice(6,8)} - {time.slice(0,2)}:{time.slice(2,4)}</span>
      }},
      { key: 'stats.total', label: 'کل لاگ‌ها', width: 'w-24', render: (s: any) => <span className="text-white font-bold">{s.stats.total}</span> },
      { key: 'stats.errors', label: 'خطاها', width: 'w-24', render: (s: any) => (
          <span className={clsx("font-bold", s.stats.errors > 0 ? "text-red-400" : "text-emerald-400")}>{s.stats.errors}</span>
      )},
      { key: 'stats.users', label: 'کاربران', width: 'w-24', render: (s: any) => <span className="text-blue-300">{s.stats.users}</span> },
      { key: 'raw_file', label: 'فایل خام', render: (s: any) => (
          <span className="text-[10px] font-mono opacity-50">{s.raw_file}</span>
      )},
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20">
                    <Activity className="text-white" size={24} />
                </div>
                مرکز کنترل (Mission Control)
            </h2>
        </div>

        <div className="bg-[#1e1e1e] border border-white/5 p-1 rounded-xl flex items-center gap-1 overflow-x-auto shadow-xl">
            {[
                { id: 'overview', label: 'نمای کلی', icon: BarChart2 },
                { id: 'users', label: 'کاربران', icon: Users },
                { id: 'system', label: 'سیستم', icon: Layers },
                { id: 'logs', label: 'ترمینال', icon: Terminal },
                { id: 'archive', label: 'ماشین زمان', icon: History },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={clsx(
                        "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap",
                        activeTab === tab.id 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <tab.icon size={14} />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
            
            {/* 1. OVERVIEW */}
            {activeTab === 'overview' && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full pb-20 overflow-y-auto custom-scrollbar"
                >
                    <SmartChart 
                        title="روند کاربران فعال (DAU)"
                        data={dau}
                        dataKey="count"
                        xAxisKey="date"
                        color="#10b981"
                        type="area"
                        height={320}
                        icon={Users}
                    />
                    <SmartChart 
                        title="پرتکرارترین عملیات‌ها"
                        data={actions}
                        dataKey="count"
                        xAxisKey="action"
                        color="#9333ea"
                        type="bar"
                        height={320}
                        icon={BarChart2}
                    />
                </motion.div>
            )}

            {/* 2. USERS */}
            {activeTab === 'users' && (
                <SmartTable title="تحلیل رفتار کاربران" data={profiling} columns={userColumns} icon={Users} />
            )}

            {/* 3. SYSTEM */}
            {activeTab === 'system' && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full"
                >
                    <SmartTable title="آمار دپارتمان‌ها" data={system?.events_distribution || []} columns={systemDeptColumns} icon={Layers} />
                    <SmartTable title="توزیع نقش‌ها" data={system?.user_demographics || []} columns={systemRoleColumns} icon={Users} />
                </motion.div>
            )}

            {/* 4. LOGS */}
            {activeTab === 'logs' && (
                <SmartTable 
                    title="ترمینال زنده (آخرین ۲۰۰ رکورد)" 
                    data={logs} 
                    columns={logColumns} 
                    icon={Terminal}
                    rowClassName={(l) => l.event_type === 'ERROR' ? "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500" : ""}
                    expandedRowRender={(log) => {
                        let details = {};
                        try { details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details; } 
                        catch { details = { raw: log.details }; }
                        return (
                            <div className="p-4 flex gap-6 text-xs text-gray-300">
                                {(details as any).context && (
                                    <div className="flex flex-col gap-2 min-w-[150px] border-l border-white/10 pl-4">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Device</div>
                                        <div className="flex items-center gap-2"><Smartphone size={12} /> {(details as any).context.screen?.width < 768 ? "Mobile" : "Desktop"}</div>
                                        <div className="flex items-center gap-2"><Wifi size={12} /> {(details as any).context.network?.type || "Unknown"}</div>
                                    </div>
                                )}
                                <div className="flex-1"><JsonTree data={details} /></div>
                            </div>
                        );
                    }}
                />
            )}

            {/* 5. TIME MACHINE */}
            {activeTab === 'archive' && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col h-full gap-4"
                >
                    <div className="h-64 shrink-0">
                         <SmartChart 
                            title="تاریخچه سلامت سیستم (Timeline)"
                            data={timelineData}
                            dataKey="total"
                            xAxisKey="date"
                            color="#f59e0b"
                            type="bar"
                            height={240}
                            icon={History}
                        />
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                         <div className="absolute top-4 left-4 z-20">
                            <button 
                                onClick={() => snapshotMutation.mutate()}
                                disabled={snapshotMutation.isPending}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
                            >
                                {snapshotMutation.isPending ? <RefreshCw className="animate-spin" size={12}/> : <Play size={12}/>}
                                ثبت وضعیت فعلی (Force Snapshot)
                            </button>
                        </div>

                        <SmartTable 
                            title="نقاط بازگشت (Hourly Snapshots)" 
                            data={snapshots} 
                            columns={snapshotColumns} 
                            icon={Database} 
                            expandedRowRender={(s) => (
                                <div className="p-4 bg-black/20 text-xs">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-bold text-gray-400 mb-2">خلاصه وضعیت</h4>
                                            <div className="space-y-1">
                                                {Object.entries(s.breakdown || {}).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between border-b border-white/5 pb-1">
                                                        <span>{k}</span>
                                                        <span className="font-mono">{String(v)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-400 mb-2">دانلود</h4>
                                            <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                                                <FileDown size={14} /> دانلود فایل خام ({s.raw_file})
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                </motion.div>
            )}

        </AnimatePresence>
      </div>
    </div>
  );
}