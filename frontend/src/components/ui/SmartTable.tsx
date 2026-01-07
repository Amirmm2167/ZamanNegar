"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
    Search, Filter, Copy, FileJson, Table as TableIcon, 
    CheckSquare, Square, ArrowUpDown, XCircle, ChevronDown, ChevronRight, Download
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export interface Column<T> {
    key: keyof T | string; 
    label: string;
    render?: (item: T) => React.ReactNode; 
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
}

interface SmartTableProps<T> {
    data: T[];
    columns: Column<T>[];
    title: string;
    icon?: React.ElementType;
    onRowClick?: (item: T) => void;
    rowClassName?: (item: T) => string;
    expandedRowRender?: (item: T) => React.ReactNode; 
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
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
    
    // FILTER STATE
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
    const filterRef = useRef<HTMLDivElement>(null);

    // Close filter dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- LOGIC: DATA PROCESSING ---
    const processedData = useMemo(() => {
        if (!Array.isArray(data)) return [];

        let result = [...data];

        // 1. Column Filters (Exact Match)
        Object.entries(activeFilters).forEach(([key, value]) => {
            if (value) {
                result = result.filter(item => String((item as any)[key]) === value);
            }
        });

        // 2. Global Fuzzy Search (Recursive)
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

        // 3. Sorting
        if (sortConfig) {
            result.sort((a, b) => {
                const key = sortConfig.key;
                const aVal = (a as any)[key];
                const bVal = (b as any)[key];
                
                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, searchTerm, sortConfig, activeFilters]);

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

    // --- EXPORT LOGIC ---
    const handleExport = (format: 'copy' | 'csv' | 'json') => {
        const itemsToExport = selectedIndices.size > 0 
            ? processedData.filter((_, i) => selectedIndices.has(i))
            : processedData; 

        if (itemsToExport.length === 0) return;

        if (format === 'copy') {
            const text = JSON.stringify(itemsToExport, null, 2);
            navigator.clipboard.writeText(text);
            alert(`${itemsToExport.length} مورد کپی شد!`);
            return;
        }

        let content = "";
        let mimeType = "";
        let extension = "";

        if (format === 'json') {
            content = JSON.stringify(itemsToExport, null, 2);
            mimeType = "application/json";
            extension = "json";
        } else if (format === 'csv') {
            // Simple CSV generator
            const keys = columns.map(c => c.key as string);
            const header = columns.map(c => c.label).join(",");
            const rows = itemsToExport.map(row => 
                keys.map(k => {
                    const val = (row as any)[k];
                    return typeof val === 'object' ? JSON.stringify(val).replace(/"/g, '""') : `"${val}"`;
                }).join(",")
            ).join("\n");
            content = `${header}\n${rows}`;
            mimeType = "text/csv";
            extension = "csv";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `export_${title}_${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to extract unique values for filter dropdown
    const getFilterOptions = (key: string) => {
        if (!Array.isArray(data)) return [];
        const values = new Set(data.map(item => String((item as any)[key])));
        return Array.from(values).slice(0, 10); // Limit to top 10 unique values
    };

    if (!Array.isArray(data)) {
        return <div className="p-4 text-center text-red-500">خطا: داده نامعتبر است</div>;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#1e1e1e]/80 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col h-full shadow-2xl overflow-hidden ring-1 ring-white/10 relative"
        >
            {/* TOOLBAR */}
            <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row gap-4 justify-between shrink-0 items-center z-20 relative">
                <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                    {Icon && (
                        <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 rounded-xl border border-white/5 shadow-inner">
                            <Icon size={18} />
                        </div>
                    )}
                    <h3 className="font-bold text-gray-200 hidden sm:block whitespace-nowrap">{title}</h3>
                    
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md w-full group">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={14} />
                        <input 
                            type="text" 
                            placeholder={`جستجو در ${processedData.length} رکورد...`}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pr-9 pl-8 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all placeholder:text-gray-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><XCircle size={14} /></button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 self-end sm:self-auto relative" ref={filterRef}>
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={clsx(
                            "p-2 rounded-lg transition-colors border",
                            isFilterOpen || Object.keys(activeFilters).length > 0 
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/50" 
                                : "hover:bg-white/10 text-gray-400 border-transparent"
                        )}
                        title="فیلترها"
                    >
                        <Filter size={16}/>
                    </button>
                    
                    <AnimatePresence>
                        {isFilterOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 mt-2 w-64 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-4 z-50 origin-top-left"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-white">فیلترها</h4>
                                    {Object.keys(activeFilters).length > 0 && (
                                        <button onClick={() => setActiveFilters({})} className="text-[10px] text-red-400 hover:underline">حذف همه</button>
                                    )}
                                </div>
                                <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
                                    {columns.filter(c => c.filterable).map(col => (
                                        <div key={String(col.key)}>
                                            <label className="text-[10px] text-gray-500 mb-1 block">{col.label}</label>
                                            <select 
                                                className="w-full bg-black/40 border border-white/10 rounded-lg text-xs text-white p-1.5 focus:border-blue-500 outline-none"
                                                value={activeFilters[String(col.key)] || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newFilters = { ...activeFilters };
                                                    if (val) newFilters[String(col.key)] = val;
                                                    else delete newFilters[String(col.key)];
                                                    setActiveFilters(newFilters);
                                                }}
                                            >
                                                <option value="">همه</option>
                                                {getFilterOptions(String(col.key)).map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                    {columns.filter(c => c.filterable).length === 0 && (
                                        <p className="text-[10px] text-gray-600">ستونی برای فیلتر وجود ندارد.</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* HEADER */}
            <div className="flex items-center bg-black/40 border-b border-white/5 px-4 py-3 text-[11px] text-gray-400 uppercase tracking-wider font-bold shrink-0 select-none z-10">
                <button onClick={toggleSelectAll} className="w-8 flex items-center justify-center hover:text-white transition-colors">
                    {selectedIndices.size > 0 && selectedIndices.size === processedData.length ? <CheckSquare size={16} className="text-blue-400"/> : <Square size={16} />}
                </button>
                
                {expandedRowRender && <div className="w-8"></div>}
                
                {columns.map((col, i) => (
                    <div 
                        key={i} 
                        className={clsx(
                            "flex items-center gap-1 cursor-pointer hover:text-white transition-colors text-right dir-rtl", // Added text-right
                            col.width || "flex-1"
                        )}
                        onClick={() => col.sortable !== false ? handleSort(col.key as string) : undefined}
                    >
                        {col.label}
                        {sortConfig?.key === col.key && <ArrowUpDown size={12} className="text-blue-400" />}
                    </div>
                ))}
            </div>

            {/* SELECTION BAR (FLOATING) */}
            <AnimatePresence>
                {selectedIndices.size > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10"
                    >
                        <span className="text-xs font-bold whitespace-nowrap">{selectedIndices.size} انتخاب شده</span>
                        <div className="h-4 w-px bg-white/20"></div>
                        <div className="flex gap-1">
                            <button onClick={() => handleExport('copy')} className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded-lg text-xs transition-colors" title="کپی در کلیپ‌بورد">
                                <Copy size={14} /> کپی
                            </button>
                            <button onClick={() => handleExport('json')} className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded-lg text-xs transition-colors" title="دانلود JSON">
                                <FileJson size={14} /> JSON
                            </button>
                            <button onClick={() => handleExport('csv')} className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded-lg text-xs transition-colors" title="دانلود CSV">
                                <TableIcon size={14} /> CSV
                            </button>
                        </div>
                        <div className="h-4 w-px bg-white/20"></div>
                        <button onClick={() => setSelectedIndices(new Set())} className="hover:bg-white/20 p-1 rounded-full"><XCircle size={14} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <AnimatePresence initial={false}>
                    {processedData.map((item, i) => (
                        <div key={(item.id as any) || i}>
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className={clsx(
                                    "flex items-center px-4 py-3 border-b border-white/5 last:border-0 transition-colors group cursor-pointer",
                                    selectedIndices.has(i) ? "bg-blue-500/10" : "hover:bg-white/5",
                                    rowClassName ? rowClassName(item) : ""
                                )}
                                onClick={() => onRowClick ? onRowClick(item) : toggleSelect(i)}
                            >
                                <button onClick={(e) => { e.stopPropagation(); toggleSelect(i); }} className="w-8 flex items-center justify-center text-gray-600 group-hover:text-gray-400 transition-colors">
                                    {selectedIndices.has(i) ? <CheckSquare size={16} className="text-blue-400"/> : <Square size={16} />}
                                </button>
                                {expandedRowRender && (
                                    <button onClick={(e) => { e.stopPropagation(); toggleExpand(i); }} className="w-8 flex items-center justify-center text-gray-500 hover:text-white">
                                        {expandedIndices.has(i) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </button>
                                )}
                                {columns.map((col, cIndex) => (
                                    <div key={cIndex} className={clsx("text-xs text-gray-300 truncate px-1", col.width || "flex-1")}>
                                        {col.render ? col.render(item) : String((item as any)[col.key] || "-")}
                                    </div>
                                ))}
                            </motion.div>
                            <AnimatePresence>
                                {expandedIndices.has(i) && expandedRowRender && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-black/40 border-b border-white/5 shadow-inner">
                                        {expandedRowRender(item)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </AnimatePresence>
                {processedData.length === 0 && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                        <div className="p-4 bg-white/5 rounded-full"><Search size={32} className="opacity-40" /></div>
                        <span className="text-sm font-medium">موردی یافت نشد</span>
                        <button onClick={() => { setSearchTerm(""); setActiveFilters({}); }} className="text-xs text-blue-400 hover:underline">
                            پاک کردن فیلترها
                        </button>
                    </div>
                )}
            </div>
             <div className="bg-black/20 border-t border-white/10 p-2 px-4 flex justify-between items-center text-[10px] text-gray-500 shrink-0">
                <span>نمایش {processedData.length} از {data.length} رکورد</span>
            </div>
        </motion.div>
    );
}