"use client";

import { useState, useEffect, useRef } from "react";
import { EventInstance, Department } from "@/types";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";
import { startOfWeek, addDays, isSameDay } from "date-fns-jalali";

interface WeekViewProps {
  currentDate: Date;
  events: EventInstance[];
  holidays: any[];
  departments: Department[];
  hiddenDeptIds: number[];
  onEventClick: (e: EventInstance) => void;
  onEventLongPress: (e: EventInstance) => void;
  onSlotClick: (date: Date, hour: number) => void;
  onEventHover: (e: React.MouseEvent, event: EventInstance) => void;
  onEventLeave: () => void;
  draftEvent: any;
}

export default function WeekView({
  currentDate,
  events,
  holidays,
  departments,
  onEventClick,
  onEventLongPress,
  onSlotClick
}: WeekViewProps) {
  
  const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  // 1. Calculate Week Days
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // 2. Auto-scroll to 8 AM on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 8 * 60; // 8 AM * 60px/hr
    }
    // Update "Current Time" line every minute
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // 3. Helper: Calculate Event Position
  const getEventPosition = (event: EventInstance) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    return {
        top: startMinutes, // 1px = 1min
        height: durationMinutes
    };
  };

  const getEventStyle = (event: EventInstance) => {
    const dept = departments.find(d => d.id === event.department_id);
    const color = dept?.color || "#6b7280";
    const isPending = event.status === 'pending';

    return {
        backgroundColor: isPending ? `${color}30` : `${color}90`,
        borderLeft: `3px solid ${color}`, // Persian uses RTL, so Border Left is the "Start" side visually? Actually Border Right is better for RTL
        borderRight: `3px solid ${color}`,
        color: '#fff',
        border: isPending ? `1px dashed ${color}` : undefined
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#020205] select-none text-right dir-rtl">
      
      {/* 1. Header (Days) */}
      <div className="flex pl-4 pr-16 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md z-20 shrink-0">
         {weekDays.map((day, i) => {
             const isToday = isSameDay(day, now);
             const dateStr = day.toISOString().split('T')[0];
             const holiday = holidays.find(h => h.holiday_date.startsWith(dateStr));

             return (
                 <div key={i} className="flex-1 flex flex-col items-center justify-center border-l border-white/5 last:border-l-0">
                     <span className={clsx("text-xs font-bold mb-1", isToday ? "text-blue-400" : "text-gray-400")}>
                        {WEEK_DAYS[i]}
                     </span>
                     <div className={clsx(
                        "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all",
                        isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-gray-300",
                        holiday && !isToday && "text-red-400 bg-red-500/10"
                     )}>
                        {toPersianDigits(day.getDate())}
                     </div>
                     {holiday && (
                        <span className="text-[9px] text-red-400 mt-1 truncate max-w-[80px]">{holiday.occasion}</span>
                     )}
                 </div>
             );
         })}
      </div>

      {/* 2. Scrollable Grid */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar relative flex"
      >
         {/* Time Sidebar (Sticky Right) */}
         <div className="w-16 shrink-0 border-l border-white/10 bg-[#09090b] z-10 sticky right-0 top-0 flex flex-col pointer-events-none">
            {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="h-[60px] relative">
                    <span className="absolute -top-2 left-2 text-[10px] text-gray-500 font-mono">
                        {toPersianDigits(h)}:00
                    </span>
                </div>
            ))}
         </div>

         {/* Columns Container */}
         <div className="flex-1 flex relative min-h-[1440px]"> 
             {/* Background Grid Lines */}
             <div className="absolute inset-0 flex flex-col z-0">
                {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="h-[60px] border-b border-white/5 w-full" />
                ))}
             </div>

             {/* Current Time Line */}
             {weekDays.some(d => isSameDay(d, now)) && (
                 <div 
                    className="absolute z-30 left-0 right-0 border-t-2 border-red-500 pointer-events-none flex items-center"
                    style={{ top: now.getHours() * 60 + now.getMinutes() }}
                 >
                    <div className="absolute right-[-6px] w-3 h-3 bg-red-500 rounded-full" />
                 </div>
             )}

             {/* Day Columns */}
             {weekDays.map((day, colIndex) => {
                 const dayEvents = events.filter(e => 
                     !hiddenDeptIds.includes(e.department_id || 0) &&
                     isSameDay(new Date(e.start_time), day) &&
                     !e.is_all_day
                 );

                 return (
                     <div key={colIndex} className="flex-1 relative border-l border-white/5 z-10 hover:bg-white/[0.01] transition-colors group">
                         
                         {/* Click Targets (Slots) */}
                         {Array.from({ length: 24 }).map((_, h) => (
                             <div 
                                key={h} 
                                className="absolute w-full h-[60px] cursor-pointer"
                                style={{ top: h * 60 }}
                                onClick={() => onSlotClick(day, h)}
                                title={`افزودن رویداد: ${toPersianDigits(h)}:00`}
                             />
                         ))}

                         {/* Render Events */}
                         {dayEvents.map(event => {
                             const pos = getEventPosition(event);
                             const style = getEventStyle(event);
                             
                             return (
                                 <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                    onContextMenu={(e) => { e.preventDefault(); onEventLongPress(event); }}
                                    className={clsx(
                                        "absolute inset-x-1 rounded-md px-2 py-1 text-xs cursor-pointer shadow-md hover:z-50 hover:scale-[1.02] transition-all overflow-hidden flex flex-col",
                                        event.status === 'pending' && "bg-hatched"
                                    )}
                                    style={{
                                        top: pos.top,
                                        height: Math.max(pos.height, 20), // Min height 20px
                                        backgroundColor: style.backgroundColor,
                                        borderRight: style.borderRight,
                                        border: style.border,
                                        color: style.color
                                    }}
                                 >
                                     <span className="font-bold truncate">{event.title}</span>
                                     <span className="text-[10px] opacity-80 truncate">
                                        {new Date(event.start_time).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})} 
                                        {' - '}
                                        {new Date(event.end_time).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}
                                     </span>
                                 </div>
                             );
                         })}
                     </div>
                 );
             })}
         </div>
      </div>
    </div>
  );
}