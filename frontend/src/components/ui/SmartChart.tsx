"use client";

import { useState, useRef, useCallback } from "react";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from "recharts";
import { Camera, Calendar, ChevronDown, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import clsx from "clsx";
import { motion } from "framer-motion";

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
    title, 
    data, 
    dataKey, 
    xAxisKey = "date", 
    color = "#3b82f6", 
    type = 'area',
    height = 300,
    icon: Icon
}: SmartChartProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
    const [isExporting, setIsExporting] = useState(false);

    // --- LOGIC: EXPORT ---
    const handleExport = useCallback(() => {
        if (ref.current === null) return;
        setIsExporting(true);
        
        toPng(ref.current, { cacheBust: true, backgroundColor: '#18181b' }) // Dark bg for export
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `chart_${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
                link.href = dataUrl;
                link.click();
                setIsExporting(false);
            })
            .catch((err) => {
                console.error('Export failed', err);
                setIsExporting(false);
            });
    }, [title]);

    // --- CUSTOM TOOLTIP ---
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/80 border border-white/10 p-2 rounded-lg backdrop-blur-md shadow-xl text-xs">
                    <p className="text-gray-400 mb-1">{label}</p>
                    <p className="font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                        {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e1e1e]/80 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col shadow-xl overflow-hidden ring-1 ring-white/10"
        >
            {/* TOOLBAR */}
            <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                            <Icon size={16} />
                        </div>
                    )}
                    <h3 className="font-bold text-gray-200 text-sm">{title}</h3>
                </div>

                <div className="flex items-center gap-2">
                    {/* Time Filter (Mock functionality for now) */}
                    <div className="hidden sm:flex bg-black/20 rounded-lg p-0.5 border border-white/5">
                        {['24h', '7d', '30d'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r as any)}
                                className={clsx(
                                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                    range === r ? "bg-white/10 text-white shadow" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {r.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Export Button */}
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                        title="دانلود نمودار (PNG)"
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16}/>}
                    </button>
                </div>
            </div>

            {/* CHART AREA */}
            <div ref={ref} className="p-4 w-full h-full min-h-[200px]" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'area' ? (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`grad_${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis 
                                dataKey={xAxisKey} 
                                stroke="#525252" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => val.slice(5)} // Show MM-DD
                            />
                            <YAxis 
                                stroke="#525252" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                                type="monotone" 
                                dataKey={dataKey} 
                                stroke={color} 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill={`url(#grad_${title})`} 
                            />
                        </AreaChart>
                    ) : (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis 
                                dataKey={xAxisKey} 
                                stroke="#525252" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'white', opacity: 0.05}}/>
                            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}