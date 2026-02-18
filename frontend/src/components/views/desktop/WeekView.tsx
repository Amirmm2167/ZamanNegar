"use client";

import { useState, useEffect, useMemo } from "react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useContextMenuStore } from "@/stores/contextMenuStore";
import { 
  getStartOfJalaliWeek, 
  toPersianDigits, 
  isSameJalaliDay,
  getJalaliDay
} from "@/lib/jalali";
import { CalendarEvent, Department } from "@/types";
import { calculateEventLayout } from "@/lib/eventLayout";
import { Plus } from "lucide-react";
import clsx from "clsx";

interface VisualEvent extends CalendarEvent {
  startPercent: number;
  sizePercent: number;
  totalLanes: number;
  laneIndex: number;
}

interface WeekViewProps {
  currentDate?: Date;
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
  
  const { currentDate } = useLayoutStore();
  const { openMenu } = useContextMenuStore();
  const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentPercent = ((currentHour * 60 + currentMinute) / 1440) * 100;

  const startOfWeek = getStartOfJalaliWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  // SPLIT EVENTS: All-Day vs Time-Based
  const { allDayEvents, timeEvents } = useMemo(() => {
      const allDay: CalendarEvent[] = [];
      const timed: CalendarEvent[] = [];
      events.forEach(e => {
          if (hiddenDeptIds.includes(e.department_id || 0)) return;
          if (e.is_all_day) allDay.push(e);
          else timed.push(e);
      });
      return { allDayEvents: allDay, timeEvents: timed };
  }, [events, hiddenDeptIds]);

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments.find(d => d.id === event.department_id);
    const color = dept?.color || "#6b7280";
    if (event.status === 'pending') {
      return { backgroundColor: `${color}30`, border: `1px dashed ${color}`, color: '#fef08a' };
    }
    return { backgroundColor: `${color}90`, borderRight: `3px solid ${color}`, color: '#fff' };
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#020205] overflow-hidden select-none">
      
      {/* 1. Time Header */}
      <div className="flex flex-row h-10 border-b border-white/10 bg-black/40 backdrop-blur-md z-20 shrink-0 mr-24">
         <div className="flex-1 relative flex">
            {Array.from({ length: 24 }).map((_, i) => (
               <div 
                  key={i} 
                  className={clsx(
                      "flex-1 border-l border-white/5 text-[10px] text-gray-500 flex items-center justify-start relative transition-colors",
                      hoveredHour === i && "bg-white/5 text-blue-400 font-bold"
                  )}
               >
                  <span className="z-10 bg-[#020205]/50 rounded font-bold rotate-270">
                    {toPersianDigits(i)}:۰۰
                  </span>
               </div>
            ))}
         </div>
      </div>

      {/* 2. Main Body */}
      <div className="flex-1 overflow-y-auto scrollbar-hide relative flex flex-col min-h-0">
          
          {weekDays.map((dayDate, dayIndex) => {
              const dateStr = dayDate.toISOString().split('T')[0];
              const holiday = holidays.find(h => h.holiday_date.split('T')[0] === dateStr);
              const isToday = isSameJalaliDay(new Date(), dayDate);
              const isHoveredRow = hoveredDayIndex === dayIndex;

              // Filter Timed Events for this Day
              const dayTimedEvents = timeEvents.filter(e => isSameJalaliDay(new Date(e.start_time), dayDate));
              const visualEvents = calculateEventLayout(dayTimedEvents as any[], 'horizontal') as unknown as VisualEvent[];
              
              // Filter All-Day Events for this Day
              const dayAllDayEvents = allDayEvents.filter(e => isSameJalaliDay(new Date(e.start_time), dayDate));

              const isDraftDay = draftEvent && isSameJalaliDay(draftEvent.date, dayDate);

              return (
                  <div 
                    key={dayIndex} 
                    className={clsx(
                        "flex border-b border-white/5 min-h-[84px] flex-1 relative transition-colors group/row",
                        isHoveredRow ? "bg-white/[0.02]" : ""
                    )}
                    onMouseEnter={() => setHoveredDayIndex(dayIndex)}
                    onMouseLeave={() => { setHoveredDayIndex(null); setHoveredHour(null); }}
                  >
                      {/* Y-Axis Label (Day) */}
                      <div className={clsx(
                          "sticky right-0 w-24 shrink-0 bg-[#09090b] border-l border-white/10 z-30 flex flex-col items-center justify-center p-2 transition-colors shadow-[-5px_0_20px_rgba(0,0,0,0.5)]",
                          isToday && "bg-blue-900/10"
                      )}>
                          <span className={clsx("text-sm font-bold", isToday ? "text-blue-400" : "text-gray-300")}>
                              {WEEK_DAYS[dayIndex]}
                          </span>
                          <div className={clsx("text-[10px] px-1 py-1 rounded-md mt-1 font-bold", isToday ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "text-gray-500")}>
                              {toPersianDigits(getJalaliDay(dayDate))}
                          </div>
                          {holiday && (
                              <span className="text-[9px] text-red-400 text-center mt-1 leading-tight line-clamp-1">
                                {holiday.occasion}
                              </span>
                          )}
                          
                          {/* ALL DAY EVENTS STACK (Inside the Day Label Column or Next to it) */}
                          {dayAllDayEvents.length > 0 && (
                              <div className="flex flex-col gap-1 mt-2 w-full">
                                  {dayAllDayEvents.map(ev => {
                                      const dept = departments.find(d => d.id === ev.department_id);
                                      return (
                                          <div 
                                              key={ev.id}
                                              onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                                              className="text-[9px] text-white px-1.5 py-0.5 rounded truncate cursor-pointer shadow-sm hover:brightness-110"
                                              style={{ backgroundColor: dept?.color || "#6b7280" }}
                                              title={ev.title}
                                          >
                                              {ev.title}
                                          </div>
                                      )
                                  })}
                              </div>
                          )}
                      </div>

                      {/* Grid Cells (Columns) */}
                      <div className="flex-1 relative flex z-0">
                          {/* Grid Background */}
                          <div className="absolute inset-0 flex">
                            {Array.from({ length: 24 }).map((_, h) => {
                                const isCrosshair = isHoveredRow && hoveredHour === h;
                                const isColHover = hoveredHour === h;
                                
                                return (
                                    <div 
                                      key={h} 
                                      className={clsx(
                                         "flex-1 border-l border-white/5 cursor-pointer transition-colors relative",
                                         isCrosshair ? "bg-white/10" : isColHover ? "bg-white/[0.03]" : "hover:bg-white/5"
                                      )}
                                      onMouseEnter={() => setHoveredHour(h)}
                                      onClick={() => onSlotClick(dayDate, h)}
                                      onContextMenu={(e) => openMenu(e, 'empty-slot', { date: dayDate, hour: h })}
                                    >
                                        {isCrosshair && (
                                            <span className="absolute top-1 right-1 text-[9px] text-gray-500 font-bold opacity-50">
                                                {toPersianDigits(h)}:۰۰
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                          </div>

                          {/* RED PULSATING PIN */}
                          {isToday && (
                             <div 
                                className="absolute top-0 bottom-0 z-40 w-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] pointer-events-none transition-all duration-[60000ms] ease-linear"
                                style={{ right: `${currentPercent}%` }}
                             >
                                <div className="absolute -top-1 -right-[3px] w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75" />
                                <div className="absolute -top-1 -right-[3px] w-2 h-2 bg-red-500 rounded-full" />
                             </div>
                          )}

                          {/* Draft Event */}
                          {isDraftDay && draftEvent && (
                             <div 
                                className="absolute top-2 bottom-2 z-10 bg-emerald-500/20 border-2 border-dashed border-emerald-500 rounded-md flex items-center justify-center animate-pulse pointer-events-none"
                                style={{
                                   right: `${(draftEvent.startHour / 24) * 100}%`,
                                   width: `${((draftEvent.endHour - draftEvent.startHour) / 24) * 100}%`
                                }}
                             >
                                <Plus className="text-emerald-400" size={20} />
                             </div>
                          )}

                          {/* Timed Events */}
                          <div className="absolute inset-0 pointer-events-none w-full h-full">
                              {visualEvents.map((ev) => {
                                  const styles = getEventStyle(ev);
                                  const laneHeight = 100 / ev.totalLanes;
                                  
                                  return (
                                      <div
                                          key={ev.id}
                                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                                          onContextMenu={(e) => openMenu(e, 'event', ev)}
                                          onMouseEnter={(e) => onEventHover(e, ev)}
                                          onMouseLeave={onEventLeave}
                                          className="absolute z-20 rounded-md shadow-lg cursor-pointer pointer-events-auto flex items-center px-2 overflow-hidden hover:brightness-110 hover:z-30 hover:shadow-xl transition-all group/event"
                                          style={{
                                              right: `${ev.startPercent}%`, 
                                              width: `${ev.sizePercent}%`,
                                              top: `${ev.laneIndex * laneHeight}%`,
                                              height: `calc(${laneHeight}% - 2px)`,
                                              backgroundColor: styles.backgroundColor,
                                              borderRight: styles.borderRight,
                                              border: styles.border,
                                              color: styles.color
                                          }}
                                      >
                                          <span className="text-[10px] font-bold  group-hover/event:whitespace-normal group-hover/event:overflow-visible mix-blend-plus-lighter">
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