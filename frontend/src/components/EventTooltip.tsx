"use client";

import { CalendarEvent, Department } from "@/types";
import { Clock, Target, User, Flag, AlignLeft, Building } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";
import { useEffect, useRef } from "react";

interface EventTooltipProps {
  event: CalendarEvent;
  departments: Department[];
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function EventTooltip({ 
  event, 
  departments, 
  onClose,
  onMouseEnter,
  onMouseLeave 
}: EventTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // --- MOUSE FOLLOW LOGIC ---
  useEffect(() => {
    const moveHandler = (e: MouseEvent) => {
      if (!tooltipRef.current) return;
      
      const offset = 15;
      let x = e.clientX + offset;
      let y = e.clientY + offset;

      const rect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Flip Logic to keep it on screen
      if (x + rect.width > viewportWidth) {
        x = e.clientX - rect.width - offset;
      }
      if (y + rect.height > viewportHeight) {
        y = e.clientY - rect.height - offset;
      }

      tooltipRef.current.style.top = `${y}px`;
      tooltipRef.current.style.left = `${x}px`;
    };

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

  // --- DYNAMIC STYLE CALCULATION ---
  const getDynamicStyles = () => {
    // 1. Rejected: Keep dark/grayscale for clarity
    if (event.status === 'rejected') {
      return {
        background: '#111827fa', // Gray-900 with opacity
        border: '#4b5563',       // Gray-600
        textHeader: '#9ca3af',   // Gray-400
        textBody: '#9ca3af'
      };
    }

    // 2. Normal / Pending: Use Department Color
    const baseColor = dept?.color || '#2563eb'; // Default Blue-600 if no dept
    
    return {
      // Use the color with high opacity (F2 = ~95%) for the background
      background: `${baseColor}F2`, 
      // Solid border matching the dept
      border: baseColor,
      // White is almost always the best "lighter" contrast against vibrant dept colors
      textHeader: '#ffffff',
      textBody: '#e5e7eb' // Gray-200
    };
  };

  const styles = getDynamicStyles();

  return (
    <div 
      ref={tooltipRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[9999] w-80 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-r-4 overflow-hidden backdrop-blur-md transition-all duration-200"
      style={{ 
        direction: "rtl",
        pointerEvents: "auto", 
        top: -1000, 
        left: -1000,
        backgroundColor: styles.background,
        borderColor: styles.border,
        color: styles.textBody
      }}
    >
      {/* Header */}
      <div className="bg-black/10 px-4 py-3 border-b border-white/10 flex justify-between items-start">
        <div>
          <h4 
            className="font-bold text-lg leading-snug drop-shadow-md"
            style={{ color: styles.textHeader }}
          >
            {event.title}
            {event.status === 'pending' && <span className="text-xs opacity-80 mr-2 font-normal">(در انتظار)</span>}
            {event.status === 'rejected' && <span className="text-xs opacity-80 mr-2 font-normal">(رد شده)</span>}
          </h4>
          
          {!isAllDay && (
            <div className="text-xs opacity-90 mt-1.5 flex items-center gap-1.5 font-medium" style={{ color: styles.textBody }}>
               <Clock size={14} /> 
               <span dir="ltr" className="font-mono tracking-wide">{toPersianDigits(timeStr)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 text-sm">
        
        {dept && (
            <div className="flex items-center gap-2 font-medium" style={{ color: styles.textHeader }}>
                <Building size={16} className="opacity-80" />
                <span>{dept.name}</span>
            </div>
        )}

        {(event as any).organizer && (
          <div className="flex items-start gap-2">
            <User size={16} className="mt-0.5 shrink-0 opacity-80" />
            <div>
              <span className="opacity-70 text-xs block mb-0.5">برگزار کننده:</span>
              <span className="opacity-100 font-medium">{(event as any).organizer}</span>
            </div>
          </div>
        )}

        {(event as any).target_audience && (
          <div className="flex items-start gap-2">
            <Target size={16} className="mt-0.5 shrink-0 opacity-80" />
            <div>
              <span className="opacity-70 text-xs block mb-0.5">مخاطبین:</span>
              <span className="opacity-100 font-medium">{(event as any).target_audience}</span>
            </div>
          </div>
        )}

        {event.goal && (
          <div className="flex items-start gap-2">
            <Flag size={16} className="mt-0.5 shrink-0 opacity-80" />
            <div>
              <span className="opacity-70 text-xs block mb-0.5">هدف:</span>
              <span className="opacity-100 font-medium">{event.goal}</span>
            </div>
          </div>
        )}

        {event.description && (
          <div className="pt-3 mt-2 border-t border-white/20 flex gap-2">
            <AlignLeft size={16} className="mt-0.5 shrink-0 opacity-70" />
            <p className="opacity-95 text-xs leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {event.status === 'rejected' && (event as any).rejection_reason && (
           <div className="bg-red-950/40 border border-red-500/30 p-2.5 rounded-lg text-red-200 text-xs mt-2">
             <strong className="block mb-1">علت رد شدن:</strong>
             {(event as any).rejection_reason}
           </div>
        )}
      </div>
    </div>
  );
}