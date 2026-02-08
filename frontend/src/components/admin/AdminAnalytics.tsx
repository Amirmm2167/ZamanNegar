"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
    Activity, Layers, Terminal, Database, Users, 
    BarChart2, RefreshCw, Smartphone, Wifi, Play, FileDown, History,
    List, PieChart, FileText
} from "lucide-react";
import clsx from "clsx";
import SmartTable, { Column } from "@/components/ui/SmartTable";
import SmartChart from "@/components/ui/SmartChart"; 
import { motion, AnimatePresence } from "framer-motion";

// --- Helper for Recursive JSON View ---
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
  
  // --- TABS STATE ---
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'terminal' | 'timemachine'>('overview');
  
  // --- SUB-TABS STATE ---
  const [intelView, setIntelView] = useState<'users_table' | 'users_chart' | 'system_depts' | 'system_roles'>('users_table');
  const [timeView, setTimeView] = useState<'files' | 'timeline'>('files');
  
  // --- CHART STATE (Fusion Engine) ---
  const [timeRange, setTimeRange] = useState('24h');

  // --- QUERIES ---
  
  // 1. Core Stats
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get("/analytics/stats?days=7").then(res => res.data) });
  const { data: system } = useQuery({ queryKey: ['admin-system'], queryFn: () => api.get("/analytics/system").then(res => res.data) });
  const { data: profiling } = useQuery({ queryKey: ['admin-profiling'], queryFn: () => api.get("/analytics/users/profiling").then(res => res.data) });
  
  // 2. Live Logs
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.get("/analytics/logs?limit=200").then(res => res.data),
    refetchInterval: 5000 
  });
  
  // 3. Snapshots
  const { data: snapshots = [] } = useQuery({ 
      queryKey: ['admin-snapshots'], 
      queryFn: () => api.get("/analytics/snapshots").then(res => res.data) 
  });

  // 4. FUSION ENGINE
  const { data: fusionTimeline = [] } = useQuery({
      queryKey: ['fusion-timeline', timeRange],
      queryFn: () => api.get(`/analytics/fusion/timeline?range=${timeRange}`).then(res => res.data)
  });

  const { data: fusionBreakdown = [] } = useQuery({
      queryKey: ['fusion-breakdown'],
      queryFn: () => api.get(`/analytics/fusion/breakdown`).then(res => res.data)
  });

  // --- MUTATIONS ---
  const snapshotMutation = useMutation({
      mutationFn: () => api.post("/analytics/archive"),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['admin-snapshots'] });
          alert("نقطه بازگشت (Snapshot) با موفقیت ثبت شد!");
      }
  });

  // --- DATA TRANSFORMATION ---
  const safeProfiling = Array.isArray(profiling) ? profiling : [];
  const safeSnapshots = Array.isArray(snapshots) ? snapshots : [];

  const userChartData = [...safeProfiling]
    .sort((a: any, b: any) => (b.total_actions || 0) - (a.total_actions || 0))
    .slice(0, 10)
    .map((u: any) => ({ name: u.name || u.username, actions: u.total_actions }));

  const snapshotTimelineData = safeSnapshots.map((s: any) => {
      try {
        const parts = s.timestamp.split('_');
        const timePart = parts[1];
        return {
            date: `${timePart.slice(0,2)}:${timePart.slice(2,4)}`,
            total: s.stats.total,
            errors: s.stats.errors
        };
      } catch { return { date: 'ERR', total: 0, errors: 0 }; }
  }).reverse();

  // --- COLUMNS ---
  const logColumns: Column<any>[] = [
      { key: 'id', label: 'ID', width: 'w-16' },
      { key: 'created_at', label: 'زمان', width: 'w-24', sortable: true, render: (l: any) => <span className="font-mono text-[10px]">{new Date(l.created_at).toLocaleTimeString('fa-IR')}</span> },
      { key: 'event_type', label: 'نوع', width: 'w-24', filterable: true, render: (l: any) => (
          <span className={clsx("font-bold text-[10px] px-2 py-0.5 rounded-md", 
            l.event_type === 'ERROR' ? "bg-red-500/10 text-red-400" : 
            l.event_type === 'API_REQ' ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
          )}>{l.event_type}</span>
      )},
      { key: 'details', label: 'جزئیات', render: (l: any) => <span className="font-mono opacity-70 truncate block max-w-lg text-[10px]">{l.details}</span> }
  ];

  const userColumns: Column<any>[] = [
      { key: 'name', label: 'نام کاربر', sortable: true, render: (u: any) => <span className="font-bold text-gray-200">{u.name}</span> },
      { key: 'role', label: 'نقش', width: 'w-24', filterable: true, render: (u: any) => <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{u.role}</span> },
      { key: 'total_actions', label: 'تعداد فعالیت', width: 'w-24', sortable: true, render: (u: any) => <span className="text-emerald-400 font-bold">{u.total_actions}</span> },
      { key: 'last_active', label: 'آخرین حضور', sortable: true, render: (u: any) => u.last_active ? <span className="text-xs">{new Date(u.last_active).toLocaleDateString('fa-IR')}</span> : '-' },
      { key: 'status', label: 'وضعیت', width: 'w-24', filterable: true, render: (u: any) => (
          <div className="flex items-center gap-2">
              <span className={clsx("w-2 h-2 rounded-full", u.status === 'Active' ? "bg-emerald-500" : "bg-gray-500")}></span>
              <span className="text-[10px]">{u.status === 'Active' ? 'فعال' : 'غیرفعال'}</span>
          </div>
      )},
  ];

  const snapshotColumns: Column<any>[] = [
      { key: 'timestamp', label: 'زمان ایجاد', sortable: true, render: (s: any) => {
          try {
            const [date, time] = s.timestamp.split('_');
            return <span className="font-mono text-xs">{date.slice(0,4)}/{date.slice(4,6)}/{date.slice(6,8)} - {time.slice(0,2)}:{time.slice(2,4)}</span>
          } catch { return <span>{s.timestamp}</span> }
      }},
      { key: 'stats.total', label: 'کل لاگ‌ها', width: 'w-24', render: (s: any) => <span className="text-white font-bold">{s.stats.total}</span> },
      { key: 'stats.errors', label: 'خطاها', width: 'w-24', render: (s: any) => (
          <span className={clsx("font-bold", s.stats.errors > 0 ? "text-red-400" : "text-emerald-400")}>{s.stats.errors}</span>
      )},
      { key: 'raw_file', label: 'فایل فشرده', render: (s: any) => <span className="text-[10px] font-mono opacity-50 ltr block text-right">{s.raw_file}</span> },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg shadow-blue-900/40">
                    <Activity className="text-white" size={24} />
                </div>
                <div>
                    <span className="block text-sm text-blue-400 font-mono tracking-wider mb-1">SYSTEM_V3</span>
                    مرکز کنترل هوشمند (Fusion Engine)
                </div>
            </h2>
        </div>

        <div className="bg-[#18181b] border border-white/5 p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl overflow-x-auto">
            {[
                { id: 'overview', label: 'نمای کلی', icon: BarChart2 },
                { id: 'intelligence', label: 'هوش تجاری', icon: Layers },
                { id: 'terminal', label: 'ترمینال', icon: Terminal },
                { id: 'timemachine', label: 'ماشین زمان', icon: History },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={clsx(
                        "px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 whitespace-nowrap",
                        activeTab === tab.id 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105" 
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* 2. MAIN CONTENT CONTAINER */}
      <div className="flex-1 overflow-hidden relative bg-[#0a0a0a]/50 rounded-3xl border border-white/5 p-1 backdrop-blur-sm">
        <AnimatePresence mode="wait">
            
            {/* --- OVERVIEW (FUSION CHARTS) --- */}
            {activeTab === 'overview' && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-6 overflow-y-auto custom-scrollbar"
                >
                    <div className="h-[400px] w-full bg-[#18181b]/50 rounded-2xl p-4 border border-white/5">
                        <SmartChart 
                            title="روند فعالیت سیستم (Data Fusion)"
                            data={fusionTimeline} 
                            dataKey="total" 
                            xAxisKey="date" 
                            defaultType="area" 
                            color="#3b82f6"
                            height={350} 
                            icon={Activity}
                            showControls={true}
                            onRangeChange={(r) => setTimeRange(r)}
                        />
                    </div>

                    <div className="h-[400px] w-full bg-[#18181b]/50 rounded-2xl p-4 border border-white/5">
                        <SmartChart 
                            title="تحلیل نوع عملیات (Aggregated)"
                            data={fusionBreakdown} 
                            dataKey="value" 
                            nameKey="name"
                            defaultType="doughnut" 
                            height={350} 
                            icon={PieChart}
                            showControls={true}
                        />
                    </div>
                </motion.div>
            )}

            {/* --- INTELLIGENCE (SUB-TABS) --- */}
            {activeTab === 'intelligence' && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col h-full"
                >
                    <div className="flex gap-2 px-6 pt-4 border-b border-white/5 overflow-x-auto">
                        <button onClick={() => setIntelView('users_table')} className={clsx("px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2", intelView === 'users_table' ? "bg-white/10 text-white border-t border-x border-white/10" : "text-gray-500 hover:text-white")}>
                            <List size={14}/> لیست کاربران
                        </button>
                        <button onClick={() => setIntelView('users_chart')} className={clsx("px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2", intelView === 'users_chart' ? "bg-white/10 text-white border-t border-x border-white/10" : "text-gray-500 hover:text-white")}>
                            <BarChart2 size={14}/> نمودار فعالیت
                        </button>
                        <button onClick={() => setIntelView('system_depts')} className={clsx("px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2", intelView === 'system_depts' ? "bg-white/10 text-white border-t border-x border-white/10" : "text-gray-500 hover:text-white")}>
                            <Layers size={14}/> دپارتمان‌ها
                        </button>
                        <button onClick={() => setIntelView('system_roles')} className={clsx("px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2", intelView === 'system_roles' ? "bg-white/10 text-white border-t border-x border-white/10" : "text-gray-500 hover:text-white")}>
                            <Users size={14}/> نقش‌ها
                        </button>
                    </div>

                    <div className="flex-1 p-6 overflow-hidden bg-white/5">
                        {intelView === 'users_table' && (
                            <SmartTable title="لیست جامع کاربران" data={safeProfiling} columns={userColumns} icon={Users} />
                        )}
                        {intelView === 'users_chart' && (
                            <div className="h-[400px] w-full">
                                <SmartChart title="مقایسه فعالیت کاربران (Top 10)" data={userChartData} dataKey="actions" xAxisKey="name" color="#f59e0b" type="bar" height={400} icon={Activity} />
                            </div>
                        )}
                        {intelView === 'system_depts' && (
                            <SmartTable title="توزیع رویدادها در دپارتمان‌ها" data={system?.events_distribution || []} columns={[{ key: 'name', label: 'دپارتمان' }, { key: 'count', label: 'تعداد رویداد' }]} icon={Layers} />
                        )}
                        {intelView === 'system_roles' && (
                            <SmartTable title="توزیع کاربران بر اساس نقش" data={system?.user_demographics || []} columns={[{ key: 'role', label: 'نقش' }, { key: 'count', label: 'تعداد کاربر' }]} icon={Users} />
                        )}
                    </div>
                </motion.div>
            )}

            {/* --- TERMINAL (FULL SCREEN TABLE) --- */}
            {activeTab === 'terminal' && (
                <motion.div className="h-full p-4">
                    <SmartTable 
                        title="ترمینال زنده (Live Logs)" 
                        data={logs} 
                        columns={logColumns} 
                        icon={Terminal}
                        rowClassName={(l) => l.event_type === 'ERROR' ? "bg-red-500/10 border-l-2 border-l-red-500" : ""}
                        expandedRowRender={(log) => {
                            let details = {};
                            try { details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details; } 
                            catch { details = { raw: log.details }; }
                            return (
                                <div className="p-4 flex gap-6 text-xs text-gray-300 bg-black/40">
                                    {(details as any).context && (
                                        <div className="flex flex-col gap-2 min-w-[150px] border-l border-white/10 pl-4 text-gray-400">
                                            <div className="flex items-center gap-2"><Smartphone size={12}/> {(details as any).context.screen?.width < 768 ? "موبایل" : "دسکتاپ"}</div>
                                            <div className="flex items-center gap-2"><Wifi size={12}/> {(details as any).context.network?.type || "نامشخص"}</div>
                                        </div>
                                    )}
                                    <div className="flex-1"><JsonTree data={details} /></div>
                                </div>
                            );
                        }}
                    />
                </motion.div>
            )}

            {/* --- TIME MACHINE (SUB-TABS) --- */}
            {activeTab === 'timemachine' && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col h-full"
                >
                    <div className="flex items-center justify-between px-6 pt-4 border-b border-white/5">
                        <div className="flex gap-2">
                            <button onClick={() => setTimeView('files')} className={clsx("px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2", timeView === 'files' ? "bg-white/10 text-white border-t border-x border-white/10" : "text-gray-500 hover:text-white")}>
                                <FileText size={14}/> لیست فایل‌های آرشیو
                            </button>
                            <button onClick={() => setTimeView('timeline')} className={clsx("px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2", timeView === 'timeline' ? "bg-white/10 text-white border-t border-x border-white/10" : "text-gray-500 hover:text-white")}>
                                <Activity size={14}/> نمودار زمانی (Timeline)
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => snapshotMutation.mutate()}
                            disabled={snapshotMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg mb-2"
                        >
                            {snapshotMutation.isPending ? <RefreshCw className="animate-spin" size={12}/> : <Play size={12}/>}
                            ثبت وضعیت فعلی
                        </button>
                    </div>

                    <div className="flex-1 p-6 overflow-hidden bg-white/5">
                        {timeView === 'files' && (
                            <SmartTable 
                                title="نقاط بازگشت (Hourly Snapshots)" 
                                data={safeSnapshots} 
                                columns={snapshotColumns} 
                                icon={Database} 
                                expandedRowRender={(s) => (
                                    <div className="p-4 bg-black/20 text-xs flex justify-between items-center">
                                        <div className="space-y-1">
                                            {Object.entries(s.breakdown || {}).map(([k, v]) => (
                                                <span key={k} className="ml-4 text-gray-400">{k}: <b className="text-white">{String(v)}</b></span>
                                            ))}
                                        </div>
                                        <button className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
                                            <FileDown size={14} /> دانلود فایل خام ({s.raw_file})
                                        </button>
                                    </div>
                                )}
                            />
                        )}
                        {timeView === 'timeline' && (
                            <div className="h-[400px] w-full">
                                <SmartChart 
                                    title="تاریخچه سلامت سیستم (Total Logs vs Errors)" 
                                    data={snapshotTimelineData} 
                                    dataKey="total" 
                                    xAxisKey="date" 
                                    color="#ea580c" 
                                    type="area" 
                                    height={400} 
                                    icon={History} 
                                />
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

        </AnimatePresence>
      </div>
    </div>
  );
}