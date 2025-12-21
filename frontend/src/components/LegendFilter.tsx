"use client";

import { useState, useRef } from "react";
import { Department } from "@/types";
import { Filter, Check, EyeOff } from "lucide-react";
import clsx from "clsx";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

interface LegendFilterProps {
  departments: Department[];
  hiddenIds: number[];
  onToggle: (id: number) => void;
  onShowAll: () => void;
}

export default function LegendFilter({ departments, hiddenIds, onToggle, onShowAll }: LegendFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setIsOpen(false));

  // Recursive Tree Renderer
  const renderTree = (parentId: number | null = null, level = 0) => {
    const children = departments.filter(d => (d.parent_id || null) === parentId);
    
    if (children.length === 0) return null;

    return (
      <div className={clsx("flex flex-col", level > 0 && "mr-4 border-r border-gray-700 pr-2")}>
        {children.map(dept => {
          const isHidden = hiddenIds.includes(dept.id);
          
          return (
            <div key={dept.id} className="mb-1">
              <button
                onClick={() => onToggle(dept.id)}
                className={clsx(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-all text-xs font-medium",
                  isHidden 
                    ? "text-gray-500 hover:bg-[#333] line-through decoration-gray-600" 
                    : "text-gray-200 hover:bg-[#333]"
                )}
              >
                {/* Color Dot / Checkbox */}
                <div 
                  className={clsx(
                    "w-3 h-3 rounded-full border flex items-center justify-center transition-colors",
                    isHidden ? "border-gray-600 bg-transparent" : "border-transparent"
                  )}
                  style={{ backgroundColor: isHidden ? 'transparent' : dept.color }}
                >
                  {!isHidden && <Check size={8} className="text-black/50" />}
                </div>
                
                <span className="truncate">{dept.name}</span>
                
                {isHidden && <EyeOff size={10} className="mr-auto" />}
              </button>
              
              {/* Recursive Children */}
              {renderTree(dept.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "p-1.5 rounded-md transition-colors border",
          isOpen 
            ? "bg-blue-600 border-blue-500 text-white" 
            : "bg-[#252526] border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
        )}
        title="فیلتر دپارتمان‌ها"
      >
        <Filter size={18} />
        {hiddenIds.length > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e1e1e]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#252526] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3 border-b border-gray-700 bg-[#2d2d2e] flex justify-between items-center">
            <span className="text-xs font-bold text-gray-300">فیلتر بر اساس دپارتمان</span>
            <button 
              onClick={onShowAll}
              className="text-[10px] text-blue-400 hover:text-blue-300"
            >
              نمایش همه
            </button>
          </div>
          
          <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {departments.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-500">
                دپارتمانی یافت نشد
              </div>
            ) : (
              renderTree(null, 0)
            )}
          </div>
        </div>
      )}
    </div>
  );
}