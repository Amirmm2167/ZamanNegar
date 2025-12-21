"use client";

import { CalendarEvent, Department } from "@/types";
import { Clock, Target, User, Flag, AlignLeft, X, Building } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";
import { useEffect, useRef } from "react";

interface EventTooltipProps {
  event: CalendarEvent;
  departments: Department[];
  onClose: () => void;
}

export default function EventTooltip({ event, departments, onClose }: EventTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // --- MOUSE FOLLOW LOGIC (Direct DOM for Performance) ---
  useEffect(() => {
    const moveHandler = (e: MouseEvent) => {
      if (!tooltipRef.current) return;
      
      const offset = 15;
      let x = e.clientX + offset;
      let y = e.clientY + offset;

      const rect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Flip Logic
      if (x + rect.width > viewportWidth) {
        x = e.clientX - rect.width - offset;
      }
      if (y + rect.height > viewportHeight) {
        y = e.clientY - rect.height - offset;
      }

      tooltipRef.current.style.top = `${y}px`;
      tooltipRef.current.style.left = `${x}px`;
    };

    // Attach global listener to track mouse even if it leaves the grid slightly
    window.addEventListener("mousemove", moveHandler);
    return () => window.removeEventListener("mousemove", moveHandler);
  }, []);

  // --- DATA PREP ---
  const dept = departments.find(d => d.id === event.department_id);
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  
  const isAllDay = (event.is_all_day === true || Number(event.is_all_day) === 1);

  const timeStr = isAllDay 
    ? "(تمام روز)" 
    : `${startDate.toLocaleTimeString("fa-IR", { hour: '2-digit', minute: '2-digit', hour12: false })} - ${endDate.toLocaleTimeString("fa-IR", { hour: '2-digit', minute: '2-digit', hour12: false })}`;

  // Status Styles
  const getStatusStyles = () => {
    if (event.status === 'pending') return { border: 'border-yellow-500/50', text: 'text-yellow-500', bg: 'bg-black/80' };
    if (event.status === 'rejected') return { border: 'border-gray-600/50', text: 'text-gray-400', bg: 'bg-black/90' };
    return { border: 'border-blue-500/50', text: 'text-blue-400', bg: 'bg-black/80' };
  };

  const styles = getStatusStyles();

  return (
    <div 
      ref={tooltipRef}
      className={clsx(
        "fixed z-[9999] w-80 rounded-md shadow-2xl border-r-4 text-gray-200 overflow-hidden backdrop-blur-xl transition-opacity duration-200",
        styles.bg,
        styles.border
      )}
      style={{ 
        direction: "rtl",
        pointerEvents: "none", // Allow clicks to pass through to grid if needed, or remove to interact
        top: -1000, left: -1000 // Initial hidden pos
      }}
    >
      {/* Header */}
      <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-start">
        <div>
          <h4 className={clsx("font-bold text-lg leading-snug", styles.text)}>
            {event.title}
            {event.status === 'pending' && <span className="text-xs opacity-70 mr-2">(در انتظار)</span>}
            {event.status === 'rejected' && <span className="text-xs opacity-70 mr-2">(رد شده)</span>}
          </h4>
          
          {/* Time Row */}
          {!isAllDay && (
            <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
               <Clock size={14} /> 
               <span dir="ltr" className="font-mono tracking-wide">{toPersianDigits(timeStr)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 text-sm">
        
        {dept && (
            <div className="flex items-center gap-2 text-blue-300">
                <Building size={16} className="text-blue-400" />
                <span>{dept.name}</span>
            </div>
        )}

        {/* Dynamic Fields from Tooltip.js Logic */}
        {(event as any).organizer && (
          <div className="flex items-start gap-2">
            <User size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">برگزار کننده:</span>
              <span>{(event as any).organizer}</span>
            </div>
          </div>
        )}

        {(event as any).target_audience && (
          <div className="flex items-start gap-2">
            <Target size={16} className="text-purple-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">مخاطبین:</span>
              <span>{(event as any).target_audience}</span>
            </div>
          </div>
        )}

        {event.goal && (
          <div className="flex items-start gap-2">
            <Flag size={16} className="text-orange-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-gray-500 text-xs block mb-0.5">هدف:</span>
              <span>{event.goal}</span>
            </div>
          </div>
        )}

        {event.description && (
          <div className="pt-3 mt-2 border-t border-white/10 flex gap-2">
            <AlignLeft size={16} className="text-gray-500 mt-0.5 shrink-0" />
            <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {event.status === 'rejected' && (event as any).rejection_reason && (
           <div className="bg-red-900/20 border border-red-500/30 p-2.5 rounded-lg text-red-200 text-xs mt-2">
             <strong className="block mb-1">علت رد شدن:</strong>
             {(event as any).rejection_reason}
           </div>
        )}
      </div>
    </div>
  );
}   