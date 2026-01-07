"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    Activity, Layers, Terminal, Database, Users,
    BarChart2, RefreshCw, Smartphone, AlertTriangle, Wifi, Cpu
} from "lucide-react";
import clsx from "clsx";
import SmartTable, { Column } from "@/components/ui/SmartTable";
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

    // --- COLUMNS CONFIG (Typed as 'any' to fix TS Errors) ---
    const logColumns: Column<any>[] = [
        { key: 'id', label: 'ID', width: 'w-16' },
        { key: 'created_at', label: 'زمان', width: 'w-24', render: (l: any) => <span className="font-mono text-[10px]">{new Date(l.created_at).toLocaleTimeString()}</span> },
        {
            key: 'event_type', label: 'نوع', width: 'w-24', render: (l: any) => (
                <span className={clsx("font-bold text-[10px] px-2 py-0.5 rounded-md",
                    l.event_type === 'ERROR' ? "bg-red-500/10 text-red-400" :
                        l.event_type === 'API_REQ' ? "bg-purple-500/10 text-purple-400" :
                            "bg-blue-500/10 text-blue-400"
                )}>{l.event_type}</span>
            )
        },
        { key: 'details', label: 'جزئیات', render: (l: any) => <span className="font-mono opacity-70 truncate block max-w-md text-[10px]">{l.details}</span> }
    ];

    const userColumns: Column<any>[] = [
        { key: 'name', label: 'نام نمایشی', render: (u: any) => <span className="font-bold text-gray-200">{u.name}</span> },
        { key: 'username', label: 'نام کاربری', render: (u: any) => <span className="font-mono text-xs opacity-80">{u.username}</span> },
        { key: 'role', label: 'نقش', width: 'w-24', render: (u: any) => <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{u.role}</span> },
        { key: 'total_actions', label: 'فعالیت‌ها', width: 'w-24', render: (u: any) => <span className="text-emerald-400 font-bold">{u.total_actions}</span> },
        { key: 'last_active', label: 'آخرین بازدید', render: (u: any) => u.last_active ? <span className="text-xs">{new Date(u.last_active).toLocaleDateString('fa-IR')}</span> : '-' },
        {
            key: 'status', label: 'وضعیت', width: 'w-24', render: (u: any) => (
                <div className="flex items-center gap-1.5">
                    <span className={clsx("w-2 h-2 rounded-full shadow-[0_0_8px]", u.status === 'Active' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-gray-500")}></span>
                    <span className="text-[10px]">{u.status === 'Active' ? 'فعال' : 'غیرفعال'}</span>
                </div>
            )
        },
    ];

    const systemDeptColumns: Column<any>[] = [
        { key: 'name', label: 'دپارتمان' },
        { key: 'count', label: 'تعداد رویداد', render: (d: any) => <span className="font-bold text-lg text-emerald-400">{d.count}</span> }
    ];

    const systemRoleColumns: Column<any>[] = [
        { key: 'role', label: 'نقش کاربری' },
        { key: 'count', label: 'تعداد کاربر', render: (u: any) => <span className="bg-blue-500/20 px-3 py-1 rounded text-blue-300 font-bold">{u.count}</span> }
    ];

    const archiveColumns: Column<any>[] = [
        { key: 'filename', label: 'نام فایل', render: (f: any) => <span className="font-mono ltr text-xs">{f.filename}</span> },
        { key: 'size_kb', label: 'حجم (KB)', width: 'w-24', render: (f: any) => <span className="text-emerald-400 font-mono text-xs">{f.size_kb}</span> },
        { key: 'created_at', label: 'تاریخ ایجاد', width: 'w-32', render: (f: any) => <span className="text-xs">{new Date(f.created_at).toLocaleString('fa-IR')}</span> },
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
                        { id: 'archive', label: 'بایگانی', icon: Database },
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
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-y-auto pb-20 custom-scrollbar"
                        >
                            <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-2xl h-80 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-300"></div>
                                <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-6 relative z-10">
                                    <Users size={18} className="text-emerald-400" /> کاربران فعال (DAU)
                                </h3>
                                <div className="h-48 flex items-end gap-2 px-2 border-b border-white/5 pb-2 relative z-10">
                                    {dau.map((item: any, i: number) => (
                                        <div key={i} className="flex flex-col items-center gap-2 flex-1 group/bar cursor-pointer">
                                            <div
                                                className="w-full bg-emerald-600/30 group-hover/bar:bg-emerald-500 rounded-t-md relative min-w-[10px] transition-all duration-300"
                                                style={{ height: `${(item.count / maxDau) * 100}%` }}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-xs opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap border border-white/10 z-20 pointer-events-none">
                                                    {item.count} کاربر
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 rotate-45 mt-2 origin-left whitespace-nowrap">{item.date.slice(5)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-[#1e1e1e] rounded-2xl border border-white/5 shadow-2xl h-80 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-300"></div>
                                <h3 className="font-bold flex items-center gap-2 text-gray-200 mb-6 relative z-10">
                                    <BarChart2 size={18} className="text-purple-400" /> عملیات‌های پرتکرار
                                </h3>
                                <div className="space-y-4 overflow-y-auto h-52 custom-scrollbar pr-2 relative z-10">
                                    {actions.map((item: any, i: number) => (
                                        <div key={i} className="group cursor-pointer">
                                            <div className="flex justify-between text-xs text-gray-300 mb-1 group-hover:text-white transition-colors">
                                                <span>{item.action}</span>
                                                <span className="font-mono">{item.count}</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-600 rounded-full shadow-[0_0_10px_rgba(147,51,234,0.3)] transition-all duration-500"
                                                    style={{ width: `${(item.count / maxActions) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 2. USERS TABLE */}
                    {activeTab === 'users' && (
                        <SmartTable
                            title="تحلیل رفتار کاربران"
                            data={profiling}
                            columns={userColumns}
                            icon={Users}
                        />
                    )}

                    {/* 3. SYSTEM STATS */}
                    {activeTab === 'system' && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full"
                        >
                            <SmartTable
                                title="آمار دپارتمان‌ها"
                                data={system?.events_distribution || []}
                                columns={systemDeptColumns}
                                icon={Layers}
                            />
                            <SmartTable
                                title="توزیع نقش‌ها"
                                data={system?.user_demographics || []}
                                columns={systemRoleColumns}
                                icon={Users}
                            />
                        </motion.div>
                    )}

                    {/* 4. LIVE LOGS - WITH EXPANSION */}
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
                                        {/* Context Badge */}
                                        {(details as any).context && (
                                            <div className="flex flex-col gap-2 min-w-[150px] border-l border-white/10 pl-4">
                                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">محیط کاربر</div>
                                                <div className="flex items-center gap-2">
                                                    <Smartphone size={12} />
                                                    <span>{(details as any).context.screen?.width < 768 ? "Mobile" : "Desktop"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Wifi size={12} />
                                                    <span>{(details as any).context.network?.type || "Unknown"}</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <JsonTree data={details} />
                                        </div>
                                    </div>
                                );
                            }}
                        />
                    )}

                    {/* 5. ARCHIVES */}
                    {activeTab === 'archive' && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col h-full gap-4"
                        >
                            <div className="p-6 bg-gradient-to-r from-orange-900/20 to-black border border-orange-500/20 rounded-2xl flex items-center justify-between shrink-0 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>
                                <div className="flex items-center gap-4 text-orange-400 relative z-10">
                                    <div className="p-3 bg-orange-500/10 rounded-xl">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-white">مدیریت فضای دیتابیس</h4>
                                        <p className="text-sm opacity-80 mt-1">جهت حفظ کارایی سیستم، لاگ‌های قدیمی‌تر از ۳۰ روز را بایگانی و از دیتابیس حذف کنید.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => archiveMutation.mutate()}
                                    disabled={archiveMutation.isPending}
                                    className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
                                >
                                    {archiveMutation.isPending ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
                                    اجرای عملیات پاکسازی
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
                        </motion.div>
                    )}

                </AnimatePresence>

            </div>
        </div>
    );
}