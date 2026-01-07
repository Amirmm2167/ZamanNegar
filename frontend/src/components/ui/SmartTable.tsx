"use client";

import { useState, useMemo } from "react";
import { 
    Search, Filter, Download, Copy, FileText, FileJson, Table as TableIcon, 
    ChevronDown, ChevronUp, CheckSquare, Square, MoreHorizontal, ArrowUpDown
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export interface Column<T> {
    key: keyof T | string; // key in data or custom id
    label: string;
    render?: (item: T) => React.ReactNode; // Custom cell renderer
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
}

export default function SmartTable<T extends { id?: string | number }>({ 
    data, 
    columns, 
    title, 
    icon: Icon,
    onRowClick,
    rowClassName
}: SmartTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // --- LOGIC: FILTER & SORT ---
    const processedData = useMemo(() => {
        let result = [...data];

        // 1. Search (Fuzzy on all string fields)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item => 
                Object.values(item as any).some(val => 
                    String(val).toLowerCase().includes(lowerTerm)
                )
            );
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

    // --- LOGIC: SELECTION ---
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

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- LOGIC: EXPORT ---
    const handleExport = (format: 'csv' | 'json' | 'txt' | 'copy') => {
        const itemsToExport = selectedIndices.size > 0 
            ? processedData.filter((_, i) => selectedIndices.has(i))
            : processedData; // Export all if none selected

        if (itemsToExport.length === 0) return;

        if (format === 'copy') {
            navigator.clipboard.writeText(JSON.stringify(itemsToExport, null, 2));
            alert(`${itemsToExport.length} items copied!`);
            return;
        }

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
        link.download = `export_${title.toLowerCase()}_${Date.now()}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl flex flex-col h-full shadow-xl overflow-hidden">
            {/* TOOLBAR */}
            <div className="p-4 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row gap-4 justify-between shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    {Icon && <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Icon size={18} /></div>}
                    <h3 className="font-bold text-gray-200 hidden sm:block">{title}</h3>
                    
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            type="text" 
                            placeholder={`جستجو در ${processedData.length} رکورد...`}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedIndices.size > 0 && (
                        <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 animate-in fade-in slide-in-from-right-4">
                            <span className="text-xs text-blue-400 font-bold ml-2">{selectedIndices.size}</span>
                            <button onClick={() => handleExport('copy')} title="کپی" className="p-1.5 hover:bg-blue-500/20 rounded text-blue-300"><Copy size={14}/></button>
                            <button onClick={() => handleExport('json')} title="JSON" className="p-1.5 hover:bg-blue-500/20 rounded text-blue-300"><FileJson size={14}/></button>
                            <button onClick={() => handleExport('csv')} title="CSV" className="p-1.5 hover:bg-blue-500/20 rounded text-blue-300"><TableIcon size={14}/></button>
                        </div>
                    )}
                    <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><Filter size={16}/></button>
                </div>
            </div>

            {/* TABLE HEADER */}
            <div className="flex items-center bg-black/40 border-b border-white/5 px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-bold shrink-0">
                <button onClick={toggleSelectAll} className="w-8 flex items-center justify-center hover:text-white">
                    {selectedIndices.size > 0 && selectedIndices.size === processedData.length ? <CheckSquare size={14} className="text-blue-400"/> : <Square size={14} />}
                </button>
                {columns.map((col, i) => (
                    <div 
                        key={i} 
                        className={clsx("flex items-center gap-1 cursor-pointer hover:text-gray-300 transition-colors", col.width || "flex-1")}
                        onClick={() => col.sortable !== false && handleExport ? handleSort(col.key as string) : undefined}
                    >
                        {col.label}
                        {sortConfig?.key === col.key && <ArrowUpDown size={10} className="text-blue-400" />}
                    </div>
                ))}
            </div>

            {/* TABLE BODY */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {processedData.map((item, i) => (
                    <div 
                        key={(item.id as any) || i} 
                        className={clsx(
                            "flex items-center px-4 py-3 border-b border-white/5 last:border-0 transition-colors group",
                            selectedIndices.has(i) ? "bg-blue-600/10" : "hover:bg-white/5",
                            rowClassName ? rowClassName(item) : ""
                        )}
                        onClick={() => onRowClick && onRowClick(item)}
                    >
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleSelect(i); }} 
                            className="w-8 flex items-center justify-center text-gray-600 group-hover:text-gray-400"
                        >
                            {selectedIndices.has(i) ? <CheckSquare size={14} className="text-blue-400"/> : <Square size={14} />}
                        </button>
                        
                        {columns.map((col, cIndex) => (
                            <div key={cIndex} className={clsx("text-xs text-gray-300 truncate px-1", col.width || "flex-1")}>
                                {col.render ? col.render(item) : String((item as any)[col.key] || "-")}
                            </div>
                        ))}
                    </div>
                ))}
                
                {processedData.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                        <Search size={32} className="opacity-20" />
                        <span className="text-sm">داده‌ای یافت نشد</span>
                    </div>
                )}
            </div>
            
            {/* FOOTER */}
            <div className="bg-black/20 border-t border-white/10 p-2 px-4 flex justify-between items-center text-[10px] text-gray-500 shrink-0">
                <span>نمایش {processedData.length} از {data.length} رکورد</span>
                <span>Sorted by: {sortConfig?.key || "Default"}</span>
            </div>
        </div>
    );
}