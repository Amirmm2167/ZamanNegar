"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Camera, Calendar, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import clsx from "clsx";

interface SmartChartProps {
    title: string;
    data: any[];
    dataKey: string;
    xAxisKey?: string;
    color?: string;
    type?: 'area' | 'bar';
    height?: number;
    icon?: React.ElementType;
}

export default function SmartChart({ 
    title, data, dataKey, xAxisKey = "date", color = "#3b82f6", type = 'area', height = 300, icon: Icon
}: SmartChartProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
    const [isExporting, setIsExporting] = useState(false);

    // Safeguard Data
    const safeData = Array.isArray(data) ? data : [];
    const filteredData = useMemo(() => {
        if (safeData.length === 0) return [];
        const len = safeData.length;
        if (range === '24h') return safeData.slice(Math.max(len - 24, 0));
        if (range === '7d') return safeData.slice(Math.max(len - 7, 0));
        return safeData;
    }, [safeData, range]);

    // Export Logic
    const handleExport = useCallback(() => {
        if (!ref.current) return;
        setIsExporting(true);
        setTimeout(() => {
            toPng(ref.current!, { cacheBust: true, backgroundColor: '#18181b' })
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = `chart.png`;
                    link.href = dataUrl;
                    link.click();
                    setIsExporting(false);
                })
                .catch(() => setIsExporting(false));
        }, 100);
    }, []);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#18181b] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md z-50">
                    <p className="text-gray-400 text-[10px] mb-1 font-mono uppercase tracking-widest">{label}</p>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                        <span className="font-bold text-white text-lg">{payload[0].value}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e1e1e]/80 backdrop-blur-xl border border-white/5 rounded-2xl flex flex-col shadow-xl overflow-hidden ring-1 ring-white/10 relative"
            ref={ref}
        >
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon && <div className="p-2 bg-[#000000]/40 rounded-lg text-gray-300 border border-white/5"><Icon size={16} /></div>}
                    <h3 className="font-bold text-gray-200 text-sm tracking-wide">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                        {['24h', '7d', '30d'].map((r) => (
                            <button key={r} onClick={() => setRange(r as any)} className={clsx("px-2 py-1 text-[10px] font-bold rounded-md transition-all", range === r ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}>{r.toUpperCase()}</button>
                        ))}
                    </div>
                    <button onClick={handleExport} disabled={isExporting} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
                        {isExporting ? <Loader2 size={16} className="animate-spin text-blue-400" /> : <Camera size={16}/>}
                    </button>
                </div>
            </div>

            <div className="p-4 w-full relative" style={{ height }}>
                {filteredData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        {type === 'area' ? (
                            <AreaChart data={filteredData}>
                                <defs>
                                    <linearGradient id={`grad_${title}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis dataKey={xAxisKey} stroke="#525252" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => typeof val === 'string' && val.length > 5 ? val.slice(5) : val} dy={10} />
                                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#grad_${title})`} animationDuration={1500} />
                            </AreaChart>
                        ) : (
                            <BarChart data={filteredData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis dataKey={xAxisKey} stroke="#525252" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'white', opacity: 0.05}}/>
                                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} animationDuration={1500} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                        <Calendar size={32} className="opacity-20 mb-2"/>
                        <span className="text-xs">No Data Available</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}