"use client";

import { useState, useMemo } from "react";
import { 
    Search, Filter, Copy, FileJson, Table as TableIcon, 
    CheckSquare, Square, ArrowUpDown, XCircle, ChevronDown, ChevronRight
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export interface Column<T> {
    key: keyof T | string; 
    label: string;
    render?: (item: T) => React.ReactNode; 
    sortable?: boolean;
    width?: string;
}

interface SmartTableProps<T> {
    data: T[];
    columns: Column<T>[];
    title: string;
    icon?: React.ElementType;
    onRowClick?: (item: T) => void;
    rowClassName?: (item: T) => string;
    expandedRowRender?: (item: T) => React.ReactNode; // NEW: For Deep Context
}

export default function SmartTable<T extends { id?: string | number }>({ 
    data = [], 
    columns, 
    title, 
    icon: Icon,
    onRowClick,
    rowClassName,
    expandedRowRender
}: SmartTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set()); // NEW

    // --- LOGIC: FILTER & SORT ---
    const processedData = useMemo(() => {
        if (!Array.isArray(data)) return [];

        let result = [...data];

        // 1. Deep Recursive Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            const deepSearch = (obj: any): boolean => {
                if (!obj) return false;
                if (typeof obj === 'string' || typeof obj === 'number') {
                    return String(obj).toLowerCase().includes(lowerTerm);
                }
                if (typeof obj === 'object') {
                    return Object.values(obj).some(val => deepSearch(val));
                }
                return false;
            };
            
            result = result.filter(item => deepSearch(item));
        }

        // 2. Sort
        if (sortConfig) {
            result.sort((a, b) => {
                const aVal = (a as any)[sortConfig.key];
                const bVal = (b as any)[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, searchTerm, sortConfig]);

    // --- ACTIONS ---
    const toggleSelect = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIndices.size === processedData.length) setSelectedIndices(new Set());
        else setSelectedIndices(new Set(processedData.map((_, i) => i)));
    };

    const toggleExpand = (index: number) => {
        const newSet = new Set(expandedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setExpandedIndices(newSet);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Export Logic (Same as before)
    const handleExport = (format: 'csv' | 'json' | 'copy') => {
        const itemsToExport = selectedIndices.size > 0 
            ? processedData.filter((_, i) => selectedIndices.has(i))
            : processedData; 

        if (itemsToExport.length === 0) return;

        if (format === 'copy') {
            const text = JSON.stringify(itemsToExport, null, 2);
            navigator.clipboard.writeText(text);
            return;
        }
        
        // ... (Keep existing JSON/CSV export logic)
        let content = "";
        let mimeType = "";
        let ext = "";

        if (format === 'json') {
            content = JSON.stringify(itemsToExport, null, 2);
            mimeType = "application/json";
            ext = "json";
        } else if (format === 'csv') {
            const headers = columns.map(c => c.label).join(",");
            const rows = itemsToExport.map(item => 
                columns.map(c => {
                    const val = (item as any)[c.key];
                    return typeof val === 'object' ? JSON.stringify(val).replace(/"/g, '""') : `"${val}"`;
                }).join(",")
            ).join("\n");
            content = `${headers}\n${rows}`;
            mimeType = "text/csv";
            ext = "csv";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `export_${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e1e1e]/80 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col h-full shadow-2xl overflow-hidden ring-1 ring-white/10"
        >
            {/* TOOLBAR */}
            <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row gap-4 justify-between shrink-0 items-center">
                <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                    {Icon && (
                        <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 rounded-xl border border-white/5 shadow-inner">
                            <Icon size={18} />
                        </div>
                    )}
                    <h3 className="font-bold text-gray-200 hidden sm:block whitespace-nowrap">{title}</h3>
                    
                    <div className="relative flex-1 max-w-md w-full group">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={14} />
                        <input 
                            type="text" 
                            placeholder={`جستجو...`}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pr-9 pl-8 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all placeholder:text-gray-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><XCircle size={14} /></button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    {selectedIndices.size > 0 && (
                        <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                            <span className="text-xs text-blue-400 font-bold ml-2 px-1 border-l border-blue-500/20">{selectedIndices.size}</span>
                            <button onClick={() => handleExport('copy')} title="Copy" className="p-1.5 hover:bg-blue-500/20 rounded text-blue-300 transition-colors"><Copy size={14}/></button>
                            <button onClick={() => handleExport('json')} title="JSON" className="p-1.5 hover:bg-blue-500/20 rounded text-blue-300 transition-colors"><FileJson size={14}/></button>
                            <button onClick={() => handleExport('csv')} title="CSV" className="p-1.5 hover:bg-blue-500/20 rounded text-blue-300 transition-colors"><TableIcon size={14}/></button>
                        </div>
                    )}
                    <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"><Filter size={16}/></button>
                </div>
            </div>

            {/* HEADER */}
            <div className="flex items-center bg-black/40 border-b border-white/5 px-4 py-3 text-[10px] text-gray-400 uppercase tracking-wider font-bold shrink-0 select-none">
                <button onClick={toggleSelectAll} className="w-8 flex items-center justify-center hover:text-white transition-colors">
                    {selectedIndices.size > 0 && selectedIndices.size === processedData.length ? <CheckSquare size={16} className="text-blue-400"/> : <Square size={16} />}
                </button>
                {/* Expand Arrow Space */}
                {expandedRowRender && <div className="w-8"></div>}
                
                {columns.map((col, i) => (
                    <div 
                        key={i} 
                        className={clsx("flex items-center gap-1 cursor-pointer hover:text-white transition-colors", col.width || "flex-1")}
                        onClick={() => col.sortable !== false ? handleSort(col.key as string) : undefined}
                    >
                        {col.label}
                        {sortConfig?.key === col.key && <ArrowUpDown size={10} className="text-blue-400" />}
                    </div>
                ))}
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {processedData.map((item, i) => (
                    <div key={(item.id as any) || i}>
                        <div 
                            className={clsx(
                                "flex items-center px-4 py-3 border-b border-white/5 transition-colors group cursor-pointer",
                                selectedIndices.has(i) ? "bg-blue-500/5" : "hover:bg-white/5",
                                rowClassName ? rowClassName(item) : ""
                            )}
                            onClick={() => onRowClick ? onRowClick(item) : toggleSelect(i)}
                        >
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleSelect(i); }} 
                                className="w-8 flex items-center justify-center text-gray-600 group-hover:text-gray-400 transition-colors"
                            >
                                {selectedIndices.has(i) ? <CheckSquare size={16} className="text-blue-400"/> : <Square size={16} />}
                            </button>

                            {/* Expand Toggle */}
                            {expandedRowRender && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(i); }} 
                                    className="w-8 flex items-center justify-center text-gray-500 hover:text-white"
                                >
                                    {expandedIndices.has(i) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                </button>
                            )}
                            
                            {columns.map((col, cIndex) => (
                                <div key={cIndex} className={clsx("text-xs text-gray-300 truncate px-1", col.width || "flex-1")}>
                                    {col.render ? col.render(item) : String((item as any)[col.key] || "-")}
                                </div>
                            ))}
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                            {expandedIndices.has(i) && expandedRowRender && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: "auto", opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-black/40 border-b border-white/5"
                                >
                                    {expandedRowRender(item)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
                
                {processedData.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                        <div className="p-4 bg-white/5 rounded-full">
                            <Search size={32} className="opacity-40" />
                        </div>
                        <span className="text-sm font-medium">داده‌ای یافت نشد</span>
                        <button onClick={() => setSearchTerm("")} className="text-xs text-blue-400 hover:underline">پاک کردن فیلترها</button>
                    </div>
                )}
            </div>
            
            <div className="bg-black/20 border-t border-white/10 p-2 px-4 flex justify-between items-center text-[10px] text-gray-500 shrink-0 select-none">
                <span>نمایش {processedData.length} از {data.length} رکورد</span>
            </div>
        </motion.div>
    );
}