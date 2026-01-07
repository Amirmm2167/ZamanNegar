"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
    BarChart2, Activity, Users, Terminal, Database, 
    Archive, RefreshCw, ChevronDown, ChevronRight,
    Server, Smartphone, Wifi, Cpu, Layers,
    Search, Filter, CheckSquare, Square, Download, Copy, FileText, FileJson, Table
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

// --- HELPERS ---
const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// --- SUB-COMPONENT: JSON VIEWER ---
const JsonViewer = ({ data }: { data: any }) => {
    if (typeof data !== 'object' || data === null) {
        return <span className="text-emerald-400 font-mono text-xs">{String(data)}</span>;
    }
    return (
        <div className="pl-3 border-l border-white/10 space-y-1 font-mono text-xs">
            {Object.entries(data).map(([key, value]) => (
                <div key={key}>
                    <span className="text-gray-500 mr-1">{key}:</span>
                    <JsonViewer data={value} />
                </div>
            ))}
        </div>
    );
};

// --- SUB-COMPONENT: LOG ROW ---
const LogRow = ({ log, selected, onToggle }: { log: any, selected: boolean, onToggle: () => void }) => {
    const [expanded, setExpanded] = useState(false);
    
    let details = {};
    try {
        details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
    } catch (e) { details = { raw: log.details }; }

    const getIcon = () => {
        if (log.event_type === 'ERROR') return <Activity className="text-red-500" size={14} />;
        if (log.event_type === 'VIEW') return <Smartphone className="text-blue-500" size={14} />;
        if (log.event_type === 'API_REQ') return <Server className="text-purple-500" size={14} />;
        return <Terminal className="text-gray-500" size={14} />;
    };

    return (
        <div className={clsx("border-b border-white/5 last:border-0 transition-colors", selected ? "bg-blue-500/10" : "bg-black/20 hover:bg-white/5")}>
            <div className="flex items-center gap-3 p-3">
                {/* Checkbox */}
                <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="text-gray-500 hover:text-white">
                    {selected ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                </button>

                {/* Expand Arrow */}
                <button onClick={() => setExpanded(!expanded)} className="w-5 flex justify-center text-gray-500 hover:text-white">
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Icon & Time */}
                <div className="w-5 flex justify-center">{getIcon()}</div>
                <div className="w-20 text-xs text-gray-500 font-mono">{new Date(log.created_at).toLocaleTimeString()}</div>
                
                {/* Type */}
                <div className={clsx("w-24 text-xs font-bold shrink-0", log.event_type === 'ERROR' ? "text-red-400" : "text-white")}>
                    {log.event_type}
                </div>

                {/* Preview */}
                <div className="flex-1 text-xs text-gray-300 truncate font-mono cursor-pointer" onClick={() => setExpanded(!expanded)}>
                    {details && (details as any).path ? (details as any).path : JSON.stringify(details).slice(0, 60)}
                </div>
            </div>
            
            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: "auto", opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black/40 border-t border-white/5"
                    >
                        <div className="p-4 flex gap-6">
                            {(details as any).context && (
                                <div className="hidden sm:flex flex-col gap-2 min-w-[150px] border-l border-white/10 pl-4">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">محیط کاربر</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-300">
                                        <Smartphone size={12} />
                                        <span>{(details as any).context.screen?.width < 768 ? "Mobile" : "Desktop"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-300">
                                        <Wifi size={12} />
                                        <span>{(details as any).context.network?.type || "Unknown"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-300">
                                        <Cpu size={12} />
                                        <span>Bat: {(details as any).context.hardware?.batteryLevel ? Math.round((details as any).context.hardware.batteryLevel * 100) + "%" : "-"}</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex-1">
                                <JsonViewer data={details} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function AdminAnalytics() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'system' | 'logs' | 'archive'>('overview');
  
  // Terminal States
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // --- QUERIES ---
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get("/analytics/stats?days=7").then(res => res.data) });
  const { data: system } = useQuery({ queryKey: ['admin-system'], queryFn: () => api.get("/analytics/system").then(res => res.data) });
  const { data: profiling } = useQuery({ queryKey: ['admin-profiling'], queryFn: () => api.get("/analytics/users/profiling").then(res => res.data) });
  const { data: archives } = useQuery({ queryKey: ['admin-archives'], queryFn: () => api.get("/analytics/archives").then(res => res.data) });
  const { data: health } = useQuery({ queryKey: ['admin-health'], queryFn: () => api.get("/analytics/health").then(res => res.data) });
  
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.get("/analytics/logs?limit=100").then(res => res.data),
    refetchInterval: autoRefresh ? 3000 : false
  });

  const archiveMutation = useMutation({
      mutationFn: () => api.post("/analytics/archive?days=30"),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['admin-archives'] });
          queryClient.invalidateQueries({ queryKey: ['admin-system'] });
          alert("بایگانی با موفقیت انجام شد.");
      }
  });

  // --- FILTER LOGIC ---
  const filteredLogs = useMemo(() => {
      return logs.filter((log: any) => {
          const matchesType = filterType === "ALL" || log.event_type === filterType;
          const matchesSearch = searchTerm === "" || 
                                log.details?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                log.event_type.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesType && matchesSearch;
      });
  }, [logs, filterType, searchTerm]);

  // Pause refresh if selecting
  useEffect(() => {
      if (selectedIds.size > 0 && autoRefresh) {
          setAutoRefresh(false);
      }
  }, [selectedIds.size]);

  // --- ACTIONS ---
  const toggleSelect = (id: number) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const selectAll = () => {
      if (selectedIds.size === filteredLogs.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(filteredLogs.map((l: any) => l.id)));
  };

  const handleExport = (format: 'json' | 'csv' | 'txt' | 'clipboard') => {
      const logsToExport = filteredLogs.filter((l: any) => selectedIds.has(l.id));
      if (logsToExport.length === 0) return;

      if (format === 'clipboard') {
          const text = logsToExport.map((l: any) => `[${l.created_at}] ${l.event_type}: ${l.details}`).join('\n');
          navigator.clipboard.writeText(text);
          alert(`${logsToExport.length} رکورد کپی شد.`);
          return;
      }

      if (format === 'json') {
          const content = JSON.stringify(logsToExport, null, 2);
          downloadFile(content, `logs_export_${Date.now()}.json`, 'application/json');
      }

      if (format === 'csv') {
          const header = "ID,Time,Type,User,Details\n";
          const rows = logsToExport.map((l: any) => 
              `${l.id},"${l.created_at}","${l.event_type}","${l.user_id || 'Anon'}","${l.details.replace(/"/g, '""')}"`
          ).join('\n');
          downloadFile(header + rows, `logs_export_${Date.now()}.csv`, 'text/csv');
      }

      if (format === 'txt') {
          const content = logsToExport.map((l: any) => 
              `----------------------------------------\nID: ${l.id}\nTime: ${l.created_at}\nType: ${l.event_type}\nDetails: ${l.details}\n`
          ).join('\n');
          downloadFile(content, `logs_export_${Date.now()}.txt`, 'text/plain');
      }

      setSelectedIds(new Set()); // Clear selection after export
  };

  const { dau = [], actions = [] } = stats || {};
  const maxDau = Math.max(...dau.map((d: any) => d.count), 1);
  const maxActions = Math.max(...actions.map((a: any) => a.count), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="text-blue-400" />
                مرکز کنترل (Mission Control)
            </h2>
            <p className="text-sm text-gray-400">رصد لحظه‌ای و هوشمند سامانه</p>
        </div>

        <div className="bg-white/5 p-1 rounded-xl flex items-center gap-1 overflow-x-auto">
            {[
                { id: 'overview', label: 'نمای کلی', icon: BarChart2 },
                { id: 'system', label: 'سیستم و کاربران', icon: Layers },
                { id: 'logs', label: 'ترمینال', icon: Terminal },
                { id: 'archive', label: 'مدیریت داده', icon: Database },
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

      {/* --- TAB CONTENT --- */}
      
      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-lg">
                <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-6">
                    <Users size={18} className="text-emerald-400"/> کاربران فعال روزانه (DAU)
                </h3>
                <div className="h-48 flex items-end gap-2 px-2">
                    {dau.map((item: any, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                        <div 
                        className="w-full bg-emerald-600/40 group-hover:bg-emerald-500 rounded-t-md transition-all relative min-w-[10px]"
                        style={{ height: `${(item.count / maxDau) * 100}%` }}
                        >
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{item.count} نفر</span>
                        </div>
                        <span className="text-[10px] text-gray-500 rotate-45 mt-2 origin-left whitespace-nowrap">{item.date.slice(5)}</span>
                    </div>
                    ))}
                </div>
            </div>
            <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-lg">
                <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-6">
                    <BarChart2 size={18} className="text-purple-400"/> محبوب‌ترین عملیات‌ها
                </h3>
                <div className="space-y-5">
                    {actions.map((item: any, i: number) => (
                    <div key={i}>
                        <div className="flex justify-between text-xs text-gray-300 mb-1.5">
                            <span className="font-mono opacity-80">{item.action}</span>
                            <span className="font-bold">{item.count}</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 rounded-full" style={{ width: `${(item.count / maxActions) * 100}%` }} />
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* 2. SYSTEM */}
      {activeTab === 'system' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="col-span-2 bg-[#1e1e1e] p-6 rounded-2xl border border-white/5">
                      <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-4">
                          <Layers size={18} className="text-orange-400"/> رویدادها در دپارتمان‌ها
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {system?.events_distribution.map((d: any, i: number) => (
                              <div key={i} className="bg-white/5 p-3 rounded-xl flex flex-col gap-1">
                                  <span className="text-2xl font-bold text-white">{d.count}</span>
                                  <span className="text-xs text-gray-400 truncate">{d.name}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5">
                      <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-4">
                          <Users size={18} className="text-blue-400"/> نقش‌های کاربری
                      </h3>
                      <div className="space-y-3">
                          {system?.user_demographics.map((u: any, i: number) => (
                              <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
                                  <span className="text-sm text-gray-300">{u.role}</span>
                                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">{u.count}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 3. LIVE LOGS (ENHANCED) */}
      {activeTab === 'logs' && (
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[700px]">
              {/* TOOLBAR */}
              <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1 max-w-xs">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                          <input 
                              type="text" 
                              placeholder="جستجو در لاگ‌ها..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                      <div className="relative">
                          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                          <select 
                              className="bg-white/5 border border-white/10 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none appearance-none cursor-pointer hover:bg-white/10"
                              value={filterType}
                              onChange={(e) => setFilterType(e.target.value)}
                          >
                              <option value="ALL">همه رویدادها</option>
                              <option value="ERROR">خطاها (ERROR)</option>
                              <option value="API_REQ">درخواست API</option>
                              <option value="VIEW">بازدیدها (VIEW)</option>
                              <option value="RAGE_CLICK">Rage Clicks</option>
                          </select>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 border-r border-white/10 pr-4">
                      <div className="flex items-center gap-2 text-xs">
                          <span className={clsx("w-2 h-2 rounded-full", autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-orange-500")}></span>
                          {autoRefresh ? "Live" : "Paused"}
                      </div>
                      <button 
                          onClick={() => setAutoRefresh(!autoRefresh)}
                          className={clsx("p-2 rounded-lg transition-colors", autoRefresh ? "text-gray-400 hover:text-white" : "bg-white/10 text-white")}
                          title={autoRefresh ? "توقف بروزرسانی خودکار" : "شروع بروزرسانی"}
                      >
                          <RefreshCw size={16} className={clsx(autoRefresh && "animate-spin")} />
                      </button>
                  </div>
              </div>

              {/* SELECTION BAR */}
              {selectedIds.size > 0 && (
                  <div className="bg-blue-600/10 border-b border-blue-500/20 p-2 px-4 flex items-center justify-between">
                      <div className="text-xs text-blue-400 font-bold">
                          {selectedIds.size} مورد انتخاب شده
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => handleExport('clipboard')} className="flex items-center gap-1 px-3 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs transition-colors">
                              <Copy size={12} /> کپی
                          </button>
                          <button onClick={() => handleExport('json')} className="flex items-center gap-1 px-3 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs transition-colors">
                              <FileJson size={12} /> JSON
                          </button>
                          <button onClick={() => handleExport('csv')} className="flex items-center gap-1 px-3 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs transition-colors">
                              <Table size={12} /> CSV
                          </button>
                          <button onClick={() => handleExport('txt')} className="flex items-center gap-1 px-3 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs transition-colors">
                              <FileText size={12} /> TXT
                          </button>
                      </div>
                  </div>
              )}
              
              {/* TABLE HEADER */}
              <div className="bg-black/40 border-b border-white/5 p-2 px-3 flex items-center gap-3 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                  <button onClick={selectAll} className="hover:text-white"><CheckSquare size={14} /></button>
                  <span className="w-5"></span>
                  <span className="w-5"></span>
                  <span className="w-20">Time</span>
                  <span className="w-24">Type</span>
                  <span>Details</span>
              </div>

              {/* LIST */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredLogs.map((log: any) => (
                      <LogRow 
                        key={log.id} 
                        log={log} 
                        selected={selectedIds.has(log.id)}
                        onToggle={() => toggleSelect(log.id)}
                      />
                  ))}
                  {filteredLogs.length === 0 && <div className="p-10 text-center text-gray-500">موردی یافت نشد</div>}
              </div>
          </div>
      )}

      {/* 4. DATA HYGIENE */}
      {activeTab === 'archive' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
                  <div>
                      <h3 className="text-gray-400 text-xs mb-2">حجم دیتابیس (تخمینی)</h3>
                      <div className="text-3xl font-bold text-white flex items-baseline gap-2">
                          {system?.db_row_count || 0}
                          <span className="text-sm font-normal text-gray-500">رکورد</span>
                      </div>
                  </div>
                  <div className="mt-auto pt-6 border-t border-white/10">
                      <button 
                          onClick={() => archiveMutation.mutate()}
                          disabled={archiveMutation.isPending}
                          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                          {archiveMutation.isPending ? <RefreshCw className="animate-spin" /> : <Archive size={18} />}
                          <span className="font-bold">بایگانی و پاکسازی (۳۰+ روز)</span>
                      </button>
                  </div>
              </div>

              <div className="col-span-2 bg-[#1e1e1e] p-6 rounded-2xl border border-white/5">
                  <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-6">
                      <Database size={18} className="text-emerald-400"/> فایل‌های بایگانی (Cold Storage)
                  </h3>
                  <div className="space-y-2">
                      {archives?.map((file: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                      <Archive size={16} />
                                  </div>
                                  <div>
                                      <div className="text-sm font-bold text-gray-200 ltr font-mono">{file.filename}</div>
                                      <div className="text-xs text-gray-500">{new Date(file.created_at).toLocaleString('fa-IR')}</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-sm font-bold text-emerald-400 ltr">{file.size_kb} KB</div>
                              </div>
                          </div>
                      ))}
                      {archives?.length === 0 && <div className="text-center py-10 text-gray-500">هیچ فایلی یافت نشد</div>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}