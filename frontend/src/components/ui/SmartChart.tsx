"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell, Legend
} from "recharts";
import { Camera, Settings2, Activity, PieChart as PieIcon, BarChart2, LineChart as LineIcon, Grid, Loader2, Download } from "lucide-react";
import { toPng } from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export type ChartType = 'area' | 'bar' | 'line' | 'scatter' | 'pie' | 'doughnut';

interface SmartChartProps {
    title: string;
    data: any[];
    dataKey: string; 
    xAxisKey?: string; 
    nameKey?: string; 
    color?: string;
    height?: number;
    icon?: React.ElementType;
    defaultType?: ChartType;
    showControls?: boolean; 
    onRangeChange?: (range: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function SmartChart({ 
    title, 
    data, 
    dataKey, 
    xAxisKey = "date", 
    nameKey = "name", 
    color = "#3b82f6", 
    height = 350, 
    icon: Icon, 
    defaultType = 'area',
    showControls = true, 
    onRangeChange
}: SmartChartProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [chartType, setChartType] = useState<ChartType>(defaultType);
    const [range, setRange] = useState('24h');
    const [isExporting, setIsExporting] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    
    // Fix: Mounted state to prevent Recharts SSR hydration mismatch / sizing issues
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const safeData = useMemo(() => Array.isArray(data) ? data : [], [data]);

    const handleExport = useCallback(() => {
        if (!ref.current) return;
        setIsExporting(true);
        setTimeout(() => {
            toPng(ref.current!, { cacheBust: true, backgroundColor: '#09090b', style: { direction: 'rtl' } })
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = `Analytics_${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
                    link.href = dataUrl;
                    link.click();
                    setIsExporting(false);
                })
                .catch((err) => {
                    console.error("Export failed:", err);
                    setIsExporting(false);
                });
        }, 50);
    }, [title]);

    const handleRangeClick = (r: string) => {
        setRange(r);
        if (onRangeChange) onRangeChange(r);
    };

    const renderChart = () => {
        if (!isMounted) return null; // Avoid render until client-side
        
        if (safeData.length === 0) {
            return (
                <div className="flex flex-col h-full items-center justify-center text-gray-500 gap-2">
                    <Activity size={32} className="opacity-20" />
                    <span className="text-xs font-mono">داده‌ای برای نمایش وجود ندارد</span>
                </div>
            );
        }

        const grid = <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />;
        const xAxis = (
            <XAxis 
                dataKey={xAxisKey} 
                stroke="#525252" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                tickFormatter={(val) => typeof val === 'string' && val.length > 5 ? val.substring(0, 5) : val}
            />
        );
        const yAxis = <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} dx={-10} />;
        const tooltip = (
            <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} 
                itemStyle={{ color: '#fff' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            />
        );

        // Wrapper to ensure dimensions
        const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
             <ResponsiveContainer width="99%" height="100%" debounce={50}>
                {children as any}
             </ResponsiveContainer>
        );

        switch (chartType) {
            case 'line':
                return (
                    <ChartWrapper>
                        <LineChart data={safeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            {grid}{xAxis}{yAxis}{tooltip}
                            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }} />
                        </LineChart>
                    </ChartWrapper>
                );
            case 'bar':
                return (
                    <ChartWrapper>
                        <BarChart data={safeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            {grid}{xAxis}{yAxis}{tooltip}
                            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartWrapper>
                );
            case 'scatter':
                return (
                    <ChartWrapper>
                        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            {grid}{xAxis}{yAxis}{tooltip}
                            <Scatter name={title} data={safeData} fill={color} />
                        </ScatterChart>
                    </ChartWrapper>
                );
            case 'pie':
            case 'doughnut':
                return (
                    <ChartWrapper>
                        <PieChart>
                            <Pie
                                data={safeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={chartType === 'doughnut' ? 70 : 0}
                                outerRadius={90}
                                paddingAngle={chartType === 'doughnut' ? 4 : 0}
                                dataKey={dataKey}
                                nameKey={nameKey}
                                stroke="none"
                            >
                                {safeData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-gray-300 text-xs ml-2">{value}</span>} />
                        </PieChart>
                    </ChartWrapper>
                );
            case 'area':
            default:
                return (
                    <ChartWrapper>
                        <AreaChart data={safeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`grad_${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            {grid}{xAxis}{yAxis}{tooltip}
                            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#grad_${title})`} />
                        </AreaChart>
                    </ChartWrapper>
                );
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="group relative bg-[#1e1e1e]/60 backdrop-blur-xl border border-white/5 rounded-3xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10"
            ref={ref}
            // Fix: Enforce height here for the container
            style={{ height: height ? `${height}px` : '350px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02] shrink-0 h-[72px]">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="p-2.5 bg-gradient-to-br from-white/10 to-white/5 rounded-xl text-gray-300 border border-white/5 shadow-inner">
                            <Icon size={18} />
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-gray-100 text-sm tracking-wide">{title}</h3>
                    </div>
                </div>

                {showControls && (
                    <div className="flex items-center gap-3">
                        {onRangeChange && (
                            <div className="hidden sm:flex bg-black/40 rounded-xl p-1 border border-white/5 dir-ltr shadow-inner">
                                {['1h', '24h', '7d', '30d'].map((r) => (
                                    <button 
                                        key={r} 
                                        onClick={() => handleRangeClick(r)} 
                                        className={clsx(
                                            "px-3 py-1 text-[10px] font-bold rounded-lg transition-all duration-300",
                                            range === r ? "bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20" : "text-gray-500 hover:text-gray-200"
                                        )}
                                    >
                                        {r.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                            <div className="relative">
                                <button 
                                    onClick={() => setSettingsOpen(!settingsOpen)} 
                                    className={clsx("p-2 rounded-lg transition-all", settingsOpen ? "bg-white/10 text-white" : "text-gray-400 hover:text-white")}
                                >
                                    <Settings2 size={16}/>
                                </button>
                                
                                <AnimatePresence>
                                    {settingsOpen && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }} 
                                            animate={{ opacity: 1, scale: 1 }} 
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="absolute top-full left-0 mt-3 bg-[#18181b] border border-white/10 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1 w-40"
                                        >
                                            {[
                                                { id: 'area', label: 'ناحیه‌ای', icon: Activity },
                                                { id: 'line', label: 'خطی', icon: LineIcon },
                                                { id: 'bar', label: 'میله‌ای', icon: BarChart2 },
                                                { id: 'doughnut', label: 'دونات', icon: PieIcon },
                                            ].map((type) => (
                                                <button 
                                                    key={type.id}
                                                    onClick={() => { setChartType(type.id as ChartType); setSettingsOpen(false); }} 
                                                    className={clsx("flex items-center justify-end gap-3 px-3 py-2 rounded-lg text-xs", chartType === type.id ? "bg-blue-600/10 text-blue-400" : "text-gray-400")}
                                                >
                                                    {type.label} <type.icon size={14}/>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <button onClick={handleExport} className="p-2 rounded-lg text-gray-400 hover:text-white">
                                {isExporting ? <Loader2 size={16} className="animate-spin text-blue-400"/> : <Download size={16}/>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Body */}
            <div className="flex-1 w-full min-h-0 relative dir-ltr p-4">
                {renderChart()}
            </div>
        </motion.div>
    );
}