"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
    Activity, Layers, Terminal, Database, Users, 
    BarChart2, RefreshCw, Smartphone, Wifi, Play, FileDown, History
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
  const [activeTab, setActiveTab] = useState<'overview' | 'intelligence' | 'terminal' | 'timemachine'>('overview');
  
  // Sub-tabs state
  const [intelSubTab, setIntelSubTab] = useState<'users' | 'system'>('users');

  // --- QUERIES ---
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get("/analytics/stats?days=7").then(res => res.data) });
  const { data: system } = useQuery({ queryKey: ['admin-system'], queryFn: () => api.get("/analytics/system").then(res => res.data) });
  const { data: profiling = [] } = useQuery({ queryKey: ['admin-profiling'], queryFn: () => api.get("/analytics/users/profiling").then(res => res.data) });
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.get("/analytics/logs?limit=200").then(res => res.data),
    refetchInterval: 3000 // Auto-refresh logs
  });
  
  const { data: snapshots = [] } = useQuery({ 
      queryKey: ['admin-snapshots'], 
      queryFn: () => api.get("/analytics/snapshots").then(res => res.data) 
  });

  // Manual Snapshot Trigger
  const snapshotMutation = useMutation({
      mutationFn: () => api.post("/analytics/archive"),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['admin-snapshots'] });
          alert("Snapshot successfully captured!");
      }
  });

  // --- DATA PREP ---
  const { dau = [], actions = [] } = stats || {};
  
  // Transform User Profiling for Chart (Top 10 Active Users)
  const userChartData = profiling
    .sort((a: any, b: any) => b.total_actions - a.total_actions)
    .slice(0, 10)
    .map((u: any) => ({ name: u.name, actions: u.total_actions }));

  const timelineData = snapshots.map((s: any) => {
      const p = s.timestamp.split('_');
      return {
          date: `${p[1].slice(0,2)}:${p[1].slice(2,4)}`, // HH:MM
          total: s.stats.total,
          errors: s.stats.errors
      };
  }).reverse();

  // --- COLUMNS ---
  const logColumns: Column<any>[] = [
      { key: 'id', label: 'ID', width: 'w-16' },
      { key: 'created_at', label: 'Time', width: 'w-24', sortable: true, render: (l: any) => <span className="font-mono text-[10px]">{new Date(l.created_at).toLocaleTimeString()}</span> },
      { key: 'event_type', label: 'Type', width: 'w-24', filterable: true, sortable: true, render: (l: any) => (
          <span className={clsx("font-bold text-[10px] px-2 py-0.5 rounded-md", 
            l.event_type === 'ERROR' ? "bg-red-500/10 text-red-400" : 
            l.event_type === 'API_REQ' ? "bg-purple-500/10 text-purple-400" :
            "bg-blue-500/10 text-blue-400"
          )}>{l.event_type}</span>
      )},
      { key: 'details', label: 'Details', render: (l: any) => <span className="font-mono opacity-70 truncate block max-w-md text-[10px]">{l.details}</span> }
  ];

  const userColumns: Column<any>[] = [
      { key: 'name', label: 'Name', sortable: true, render: (u: any) => <span className="font-bold text-gray-200">{u.name}</span> },
      { key: 'role', label: 'Role', width: 'w-24', filterable: true, render: (u: any) => <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{u.role}</span> },
      { key: 'total_actions', label: 'Actions', width: 'w-24', sortable: true, render: (u: any) => <span className="text-emerald-400 font-bold">{u.total_actions}</span> },
      { key: 'last_active', label: 'Last Active', sortable: true, render: (u: any) => u.last_active ? <span className="text-xs">{new Date(u.last_active).toLocaleDateString('fa-IR')}</span> : '-' },
  ];

  const snapshotColumns: Column<any>[] = [
      { key: 'timestamp', label: 'Time', sortable: true, render: (s: any) => {
          const [date, time] = s.timestamp.split('_');
          return <span className="font-mono text-xs">{date.slice(4,6)}/{date.slice(6,8)} {time.slice(0,2)}:{time.slice(2,4)}</span>
      }},
      { key: 'stats.total', label: 'Logs', width: 'w-20', render: (s: any) => <span className="text-white font-bold">{s.stats.total}</span> },
      { key: 'stats.errors', label: 'Errors', width: 'w-20', render: (s: any) => (
          <span className={clsx("font-bold", s.stats.errors > 0 ? "text-red-400" : "text-emerald-400")}>{s.stats.errors}</span>
      )},
      { key: 'raw_file', label: 'Archive File', render: (s: any) => <span className="text-[10px] font-mono opacity-50">{s.raw_file}</span> },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      
      {/* 1. HEADER & NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg shadow-blue-900/40">
                    <Activity className="text-white" size={24} />
                </div>
                <div>
                    <span className="block text-sm text-blue-400 font-mono tracking-wider mb-1">SYSTEM_ADMIN_V3</span>
                    Mission Control
                </div>
            </h2>
        </div>

        <div className="bg-[#18181b] border border-white/5 p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl">
            {[
                { id: 'overview', label: 'Overview', icon: BarChart2 },
                { id: 'intelligence', label: 'Intelligence', icon: Layers },
                { id: 'terminal', label: 'Terminal', icon: Terminal },
                { id: 'timemachine', label: 'Time Machine', icon: History },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={clsx(
                        "px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300",
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

      {/* 2. CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative bg-[#0a0a0a]/50 rounded-3xl border border-white/5 p-1 backdrop-blur-sm">
        <AnimatePresence mode="wait">
            
            {/* --- TAB: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-6 overflow-y-auto custom-scrollbar"
                >
                    <SmartChart 
                        title="Daily Active Users (7 Days)"
                        data={dau}
                        dataKey="count"
                        xAxisKey="date"
                        color="#10b981"
                        type="area"
                        height={320}
                        icon={Users}
                    />
                    <SmartChart 
                        title="Top System Actions"
                        data={actions}
                        dataKey="count"
                        xAxisKey="action"
                        color="#8b5cf6"
                        type="bar"
                        height={320}
                        icon={BarChart2}
                    />
                </motion.div>
            )}

            {/* --- TAB: INTELLIGENCE (SUB-TABS) --- */}
            {activeTab === 'intelligence' && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col h-full"
                >
                    {/* Sub-Tab Navigation */}
                    <div className="flex gap-4 px-6 pt-4 border-b border-white/5">
                        <button 
                            onClick={() => setIntelSubTab('users')}
                            className={clsx("pb-3 text-sm font-bold transition-colors border-b-2", intelSubTab === 'users' ? "text-blue-400 border-blue-400" : "text-gray-500 border-transparent hover:text-gray-300")}
                        >
                            User Analysis
                        </button>
                        <button 
                            onClick={() => setIntelSubTab('system')}
                            className={clsx("pb-3 text-sm font-bold transition-colors border-b-2", intelSubTab === 'system' ? "text-blue-400 border-blue-400" : "text-gray-500 border-transparent hover:text-gray-300")}
                        >
                            System Health
                        </button>
                    </div>

                    <div className="flex-1 p-6 overflow-hidden">
                        {intelSubTab === 'users' ? (
                            <div className="flex flex-col h-full gap-6">
                                <div className="h-64 shrink-0">
                                    <SmartChart 
                                        title="Most Active Users"
                                        data={userChartData}
                                        dataKey="actions"
                                        xAxisKey="name"
                                        color="#f59e0b"
                                        type="bar"
                                        height={240}
                                        icon={Users}
                                    />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <SmartTable title="User Directory" data={profiling} columns={userColumns} icon={Users} />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                                <SmartTable title="Departments" data={system?.events_distribution || []} columns={[{ key: 'name', label: 'Dept' }, { key: 'count', label: 'Events' }]} icon={Layers} />
                                <SmartTable title="User Roles" data={system?.user_demographics || []} columns={[{ key: 'role', label: 'Role' }, { key: 'count', label: 'Users' }]} icon={Users} />
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* --- TAB: TERMINAL --- */}
            {activeTab === 'terminal' && (
                <motion.div className="h-full p-4">
                    <SmartTable 
                        title="Live System Logs" 
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
                                            <div className="flex items-center gap-2"><Smartphone size={12}/> {(details as any).context.screen?.width < 768 ? "Mobile" : "Desktop"}</div>
                                            <div className="flex items-center gap-2"><Wifi size={12}/> {(details as any).context.network?.type || "N/A"}</div>
                                        </div>
                                    )}
                                    <div className="flex-1"><JsonTree data={details} /></div>
                                </div>
                            );
                        }}
                    />
                </motion.div>
            )}

            {/* --- TAB: TIME MACHINE --- */}
            {activeTab === 'timemachine' && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col h-full gap-4 p-6"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-orange-400">
                            <History />
                            <h3 className="font-bold">System Timeline</h3>
                        </div>
                        <button 
                            onClick={() => snapshotMutation.mutate()}
                            disabled={snapshotMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
                        >
                            {snapshotMutation.isPending ? <RefreshCw className="animate-spin" size={14}/> : <Play size={14}/>}
                            Create Snapshot Now
                        </button>
                    </div>

                    <div className="h-64 shrink-0">
                         <SmartChart 
                            title="Historical Activity (Timeline)"
                            data={timelineData}
                            dataKey="total"
                            xAxisKey="date"
                            color="#ea580c"
                            type="area"
                            height={240}
                            icon={Database}
                        />
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        <SmartTable 
                            title="Restore Points (Snapshots)" 
                            data={snapshots} 
                            columns={snapshotColumns} 
                            icon={Database} 
                            expandedRowRender={(s) => (
                                <div className="p-4 bg-black/20 text-xs flex justify-between items-center">
                                    <div className="space-y-1">
                                        {Object.entries(s.breakdown || {}).map(([k, v]) => (
                                            <span key={k} className="mr-4 text-gray-400">{k}: <b className="text-white">{String(v)}</b></span>
                                        ))}
                                    </div>
                                    <button className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
                                        <FileDown size={14} /> Download Raw Log ({s.raw_file})
                                    </button>
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