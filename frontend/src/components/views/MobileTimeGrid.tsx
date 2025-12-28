"use client";

import { useEffect, useState } from "react";
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
  onSlotClick: (date: Date, hour: number) => void;
}

export default function MobileTimeGrid({
  daysToShow,
  currentDate,
  events,
  holidays,
  departments,
  hiddenDeptIds,
  onEventClick,
  onSlotClick
}: MobileTimeGridProps) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate days to display
  const days = [];
  if (daysToShow === 1) {
    days.push(new Date(currentDate));
  } else {
    // For 3 days, show Yesterday, Today, Tomorrow (or centered around current)
    // Let's do: Current, +1, +2
    for (let i = 0; i < 3; i++) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        days.push(d);
    }
  }

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments.find(d => d.id === event.department_id);
    const baseColor = dept ? dept.color : "#6b7280"; 
    return { backgroundColor: `${baseColor}90`, color: "#fff", fontSize: "10px", borderRadius: "4px" };
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black/20">
        
        {/* HEADER: Day Columns */}
        <div className="flex flex-row-reverse border-b border-white/10 h-14 bg-white/5">
            {/* Spacer for Time Column (Right side) */}
            <div className="w-10 border-l border-white/10 bg-black/40 flex items-center justify-center">
                <span className="text-[10px] text-gray-500 -rotate-90">زمان</span>
            </div>

            {/* Days Header */}
            {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const holiday = holidays.find(h => h.holiday_date.split('T')[0] === day.toISOString().split('T')[0]);
                
                return (
                    <div key={i} className={clsx("flex-1 flex flex-col items-center justify-center border-r border-white/10", isToday && "bg-white/5 text-blue-400")}>
                        <span className="text-xs font-bold">{day.toLocaleDateString("fa-IR", { weekday: 'short' })}</span>
                        <span className="text-[10px] opacity-70">{day.toLocaleDateString("fa-IR-u-nu-arab", { day: 'numeric', month: 'short' })}</span>
                        {holiday && <span className="text-[8px] text-red-400 truncate w-full text-center px-1">{holiday.occasion}</span>}
                    </div>
                );
            })}
        </div>

        {/* BODY: The Grid */}
        {/* We use flex-row-reverse so the Time Column is on the RIGHT */}
        <div className="flex flex-1 flex-row-reverse relative overflow-hidden">
            
            {/* 1. Time Column (Static Height - 00 to 23 fit in screen) */}
            <div className="w-10 flex flex-col border-l border-white/10 bg-black/40 z-10">
                {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 flex items-center justify-center border-b border-white/5 text-[9px] text-gray-500 font-mono">
                        {h}
                    </div>
                ))}
            </div>

            {/* 2. Day Columns */}
            {days.map((day, i) => {
                // Filter events for this day
                const dayEvents = events.filter(e => {
                    if (e.is_all_day) return false;
                    const eStart = new Date(e.start_time);
                    const isSameDay = eStart.toDateString() === day.toDateString();
                    return isSameDay && (!e.department_id || !hiddenDeptIds.includes(e.department_id));
                });

                // Calculate Layout (Events side-by-side if overlapping)
                // Note: The library expects horizontal timeline, we need to map vertical logic
                // Actually, logic is same (0-100%), just applied to Height/Top instead of Width/Right
                const visualEvents = calculateEventLayout(dayEvents);

                return (
                    <div key={i} className="flex-1 relative border-r border-white/10 h-full">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex flex-col z-0">
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} className="flex-1 border-b border-white/5" onClick={() => onSlotClick(day, h)}></div>
                            ))}
                        </div>

                        {/* Events */}
                        {visualEvents.map((ev) => {
                            const original = dayEvents.find(e => e.id === ev.id);
                            if(!original) return null;
                            const style = getEventStyle(original);
                            
                            // Important: Map visual layout (Left/Width) to horizontal space in the column
                            // Map Time (Top/Height) to vertical space
                            // Since `calculateEventLayout` gives { left, width } for horizontal, 
                            // we use those for horizontal positioning within the column.
                            // But we need to manually calc TOP/HEIGHT based on time.
                            
                            const start = new Date(original.start_time);
                            const end = new Date(original.end_time);
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const endMin = end.getHours() * 60 + end.getMinutes();
                            const dayMin = 1440; // 24 * 60

                            const topPercent = (startMin / dayMin) * 100;
                            const heightPercent = ((endMin - startMin) / dayMin) * 100;

                            return (
                                <div
                                    key={ev.id}
                                    onClick={(e) => { e.stopPropagation(); onEventClick(original); }}
                                    className="absolute z-10 px-1 flex flex-col justify-center overflow-hidden shadow-md"
                                    style={{
                                        top: `${topPercent}%`,
                                        height: `${heightPercent}%`,
                                        // Use the layout engine's horizontal calculation
                                        right: `${ev.right}%`, 
                                        width: `${ev.width}%`,
                                        ...style
                                    }}
                                >
                                    <span className="truncate font-bold leading-tight">{original.title}</span>
                                </div>
                            );
                        })}
                        
                        {/* Current Time Indicator */}
                        {day.toDateString() === now.toDateString() && (
                             <div 
                                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                                style={{ top: `${(now.getHours() * 60 + now.getMinutes()) / 1440 * 100}%` }}
                             >
                                 <div className="absolute right-[-4px] -top-[3px] w-2 h-2 bg-red-500 rounded-full"></div>
                             </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
}