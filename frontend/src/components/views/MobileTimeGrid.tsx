"use client";

import { useEffect, useState, useRef } from "react";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";
import { calculateEventLayout } from "@/lib/eventLayout";

interface MobileTimeGridProps {
  daysToShow: 1 | 3;
  currentDate: Date;
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  hiddenDeptIds: number[];
  onEventClick: (e: CalendarEvent) => void;
  onEventLongPress: (e: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
  draftEvent: { date: Date; startHour: number; endHour: number } | null;
}

export default function MobileTimeGrid({
  daysToShow,
  currentDate,
  events,
  holidays,
  departments,
  hiddenDeptIds,
  onEventClick,
  onEventLongPress,
  onSlotClick,
  draftEvent
}: MobileTimeGridProps) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // --- Long Press Logic ---
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, event: CalendarEvent) => {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          onEventLongPress(event);
      }, 500); // 500ms for long press
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent, event: CalendarEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (!isLongPress.current) {
          onEventClick(event);
      }
  };

  // Generate Days
  const days = [];
  if (daysToShow === 1) {
    days.push(new Date(currentDate));
  } else {
    for (let i = 0; i < 3; i++) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        days.push(d);
    }
  }

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments.find(d => d.id === event.department_id);
    const baseColor = dept ? dept.color : "#6b7280"; 
    
    // Status Styles
    if (event.status === 'pending') {
        return { 
            backgroundColor: `${baseColor}20`, 
            border: `1px dashed ${baseColor}`, 
            color: baseColor 
        };
    }
    return { 
        backgroundColor: `${baseColor}90`, 
        color: "#fff",
        borderRight: `3px solid ${baseColor}`
    };
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black/20">
        
        {/* HEADER */}
        <div className="flex flex-row-reverse border-b border-white/10 h-14 bg-white/5 shrink-0">
            {/* Spacer */}
            <div className="w-10 border-l border-white/10 bg-black/40"></div>

            {/* Days Header */}
            {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const holiday = holidays.find(h => h.holiday_date.split('T')[0] === day.toISOString().split('T')[0]);
                
                return (
                    <div key={i} className={clsx("flex-1 flex flex-col items-center justify-center border-r border-white/10 relative overflow-hidden", isToday && "bg-white/5")}>
                        <span className={clsx("text-xs font-bold", isToday ? "text-blue-400" : "text-gray-300")}>
                            {day.toLocaleDateString("fa-IR", { weekday: 'short' })}
                        </span>
                        <span className="text-[10px] opacity-70">
                            {day.toLocaleDateString("fa-IR-u-nu-arab", { day: 'numeric', month: 'short' })}
                        </span>
                        {holiday && <span className="text-[8px] text-red-400 w-full text-center px-1 truncate">{holiday.occasion}</span>}
                    </div>
                );
            })}
        </div>

        {/* GRID BODY */}
        <div className="flex flex-1 flex-row-reverse relative overflow-hidden">
            
            {/* 1. Time Column (Static 24h) */}
            <div className="w-10 flex flex-col border-l border-white/10 bg-black/40 z-10 shrink-0">
                {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 flex items-center justify-center border-b border-white/5 text-[9px] text-gray-500 font-mono relative">
                        <span className="absolute -top-2">{h}</span>
                    </div>
                ))}
            </div>

            {/* 2. Day Columns */}
            {days.map((day, i) => {
                const dayEvents = events.filter(e => {
                    if (e.is_all_day) return false;
                    const eStart = new Date(e.start_time);
                    return eStart.toDateString() === day.toDateString() && (!e.department_id || !hiddenDeptIds.includes(e.department_id));
                });

                const visualEvents = calculateEventLayout(dayEvents);

                return (
                    <div key={i} className="flex-1 relative border-r border-white/10 h-full">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex flex-col z-0">
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div 
                                    key={h} 
                                    className="flex-1 border-b border-white/5" 
                                    onClick={() => onSlotClick(day, h)}
                                ></div>
                            ))}
                        </div>

                        {/* Placeholder / Draft Event */}
                        {draftEvent && draftEvent.date.toDateString() === day.toDateString() && (
                            <div 
                                className="absolute z-20 left-1 right-1 bg-emerald-500/20 border-2 border-dashed border-emerald-500 rounded flex items-center justify-center animate-pulse cursor-pointer"
                                style={{
                                    top: `${(draftEvent.startHour / 24) * 100}%`,
                                    height: `${((draftEvent.endHour - draftEvent.startHour) / 24) * 100}%`
                                }}
                                onClick={() => onSlotClick(day, draftEvent.startHour)}
                            >
                                <Plus className="text-emerald-400" size={16} />
                            </div>
                        )}

                        {/* Events */}
                        {visualEvents.map((ev) => {
                            const original = dayEvents.find(e => e.id === ev.id);
                            if(!original) return null;
                            const style = getEventStyle(original);
                            
                            const start = new Date(original.start_time);
                            const end = new Date(original.end_time);
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const endMin = end.getHours() * 60 + end.getMinutes();
                            const dayMin = 1440; 

                            const topPercent = (startMin / dayMin) * 100;
                            const heightPercent = ((endMin - startMin) / dayMin) * 100;

                            return (
                                <div
                                    key={ev.id}
                                    onMouseDown={(e) => handleTouchStart(e, original)}
                                    onMouseUp={(e) => handleTouchEnd(e, original)}
                                    onTouchStart={(e) => handleTouchStart(e, original)}
                                    onTouchEnd={(e) => handleTouchEnd(e, original)}
                                    className="absolute z-10 px-1.5 flex flex-col justify-center overflow-hidden shadow-sm cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                                    style={{
                                        top: `${topPercent}%`,
                                        height: `max(20px, ${heightPercent}%)`,
                                        right: `${ev.right}%`, 
                                        width: `${ev.width}%`,
                                        fontSize: '10px',
                                        lineHeight: '1.2',
                                        borderRadius: '4px',
                                        ...style
                                    }}
                                >
                                    <span className="truncate font-bold">{original.title}</span>
                                    {heightPercent > 3 && (
                                        <span className="truncate opacity-80 text-[9px]">
                                            {start.toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    </div>
  );
}