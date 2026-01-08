"use client";

import { useState } from "react";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";
import { calculateEventLayout } from "@/lib/eventLayout";
import { Plus } from "lucide-react";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  hiddenDeptIds: number[];
  onEventClick: (e: CalendarEvent) => void;
  onEventLongPress: (e: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
  onEventHover: (e: React.MouseEvent, event: CalendarEvent) => void;
  onEventLeave: () => void;
  draftEvent: { date: Date; startHour: number; endHour: number } | null;
}

export default function WeekView({
  currentDate,
  events,
  holidays,
  departments,
  hiddenDeptIds,
  onEventClick,
  onEventLongPress,
  onSlotClick,
  onEventHover,
  onEventLeave,
  draftEvent
}: WeekViewProps) {
  
  const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  
  // Calculate Start of Week
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); 
    const diff = (day + 1) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  };
  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments.find(d => d.id === event.department_id);
    const color = dept?.color || "#6b7280";
    
    if (event.status === 'pending') {
      return { 
        backgroundColor: `${color}30`, 
        border: `1px dashed ${color}`, 
        color: '#fef08a' 
      };
    }
    return { 
      backgroundColor: `${color}90`, 
      borderRight: `3px solid ${color}`,
      color: '#fff' 
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#020205] overflow-hidden select-none">
      
      {/* 1. Time Header (X-Axis) */}
      {/* Reduced padding-right (mr-24) to match the sidebar width below */}
      <div className="flex flex-row h-10 border-b border-white/10 bg-black/40 backdrop-blur-md z-20 shrink-0 mr-24">
         <div className="flex-1 relative flex">
            {Array.from({ length: 24 }).map((_, i) => (
               <div key={i} className="flex-1 border-l border-white/5 text-[10px] text-gray-500 flex items-center justify-center relative group">
                  <span className="z-10 bg-[#020205]/50 px-1 rounded transition-colors group-hover:text-white">
                    {toPersianDigits(i)}:00
                  </span>
               </div>
            ))}
         </div>
      </div>

      {/* 2. Main Body (Rows = Days) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          
          {weekDays.map((dayDate, dayIndex) => {
              const dateStr = dayDate.toISOString().split('T')[0];
              const holiday = holidays.find(h => h.holiday_date.split('T')[0] === dateStr);
              const isToday = new Date().toDateString() === dayDate.toDateString();

              // Filter Events for this Day
              const dayEvents = events.filter(e => 
                  !hiddenDeptIds.includes(e.department_id || 0) &&
                  new Date(e.start_time).toDateString() === dayDate.toDateString() &&
                  !e.is_all_day
              );

              // Calculate Layout (Horizontal)
              const visualEvents = calculateEventLayout(dayEvents, 'horizontal');
              const isDraftDay = draftEvent && draftEvent.date.toDateString() === dayDate.toDateString();

              return (
                  <div 
                    key={dayIndex} 
                    className={clsx(
                        "flex border-b border-white/5 min-h-[80px] relative transition-colors",
                        hoveredDayIndex === dayIndex ? "bg-white/[0.03]" : ""
                    )}
                    onMouseEnter={() => setHoveredDayIndex(dayIndex)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                  >
                      
                      {/* Y-Axis Label (Day) - Sticky Right */}
                      <div className="sticky right-0 w-24 shrink-0 bg-[#09090b] border-l border-white/10 z-30 flex flex-col items-center justify-center p-2 transition-colors shadow-[-5px_0_20px_rgba(0,0,0,0.5)]">
                          <span className={clsx("text-sm font-bold", isToday ? "text-blue-400" : "text-gray-300")}>
                              {WEEK_DAYS[dayIndex]}
                          </span>
                          <div className={clsx("text-[10px] px-2 py-0.5 rounded-full mt-1 font-mono", isToday ? "bg-blue-900/30 text-blue-200" : "text-gray-500")}>
                              {toPersianDigits(dayDate.getDate())}
                          </div>
                          {holiday && (
                              <span className="text-[9px] text-red-400 text-center mt-1 leading-tight line-clamp-1">
                                {holiday.occasion}
                              </span>
                          )}
                      </div>

                      {/* Grid Cells (24 Hours) & Events Container */}
                      <div className="flex-1 relative flex z-0">
                          
                          {/* Background Grid & Click Handlers */}
                          <div className="absolute inset-0 flex">
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div 
                                  key={h} 
                                  className="flex-1 border-l border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                                  onClick={() => onSlotClick(dayDate, h)}
                                  title={`افزودن رویداد: ${toPersianDigits(h)}:00`}
                                />
                            ))}
                          </div>

                          {/* Draft Indicator */}
                          {isDraftDay && draftEvent && (
                             <div 
                                className="absolute top-2 bottom-2 z-10 bg-emerald-500/20 border-2 border-dashed border-emerald-500 rounded-md flex items-center justify-center animate-pulse pointer-events-none"
                                style={{
                                   // In Horizontal (RTL): 00:00 is Right. 
                                   // StartHour / 24 * 100 = Right Position %
                                   right: `${(draftEvent.startHour / 24) * 100}%`,
                                   width: `${((draftEvent.endHour - draftEvent.startHour) / 24) * 100}%`
                                }}
                             >
                                <Plus className="text-emerald-400" size={20} />
                             </div>
                          )}

                          {/* Events Overlay */}
                          <div className="absolute inset-0 pointer-events-none w-full h-full">
                              {visualEvents.map((ev) => {
                                  const styles = getEventStyle(ev);
                                  // In Horizontal mode: 
                                  // startPercent -> Right position (Time)
                                  // sizePercent -> Width (Duration)
                                  // laneIndex -> Top position (Stacking)
                                  const laneHeight = 100 / ev.totalLanes;
                                  
                                  return (
                                      <div
                                          key={ev.id}
                                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                                          onContextMenu={(e) => { e.preventDefault(); onEventLongPress(ev); }}
                                          onMouseEnter={(e) => onEventHover(e, ev)}
                                          onMouseLeave={onEventLeave}
                                          className="absolute z-20 rounded-md shadow-lg cursor-pointer pointer-events-auto flex items-center px-2 overflow-hidden hover:brightness-110 hover:z-30 hover:shadow-xl transition-all group/event"
                                          style={{
                                              right: `${ev.startPercent}%`, 
                                              width: `${ev.sizePercent}%`,
                                              top: `${ev.laneIndex * laneHeight}%`,
                                              height: `calc(${laneHeight}% - 2px)`, // -2px gap
                                              backgroundColor: styles.backgroundColor,
                                              borderRight: styles.borderRight,
                                              border: styles.border,
                                              color: styles.color
                                          }}
                                      >
                                          <span className="text-[10px] font-bold truncate group-hover/event:whitespace-normal group-hover/event:overflow-visible mix-blend-plus-lighter">
                                              {ev.title}
                                          </span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                  </div>
              );
          })}
      </div>
    </div>
  );
}