"use client";

import { useRef, useEffect, useState } from "react";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";
import { calculateEventLayout } from "@/lib/eventLayout";
import { Plus, Maximize2, Minimize2 } from "lucide-react";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  
  // Landscape Mode State
  const [isLandscape, setIsLandscape] = useState(false);

  const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    if (scrollRef.current) {
        const currentHour = new Date().getHours();
        const scrollContainer = scrollRef.current;
        const hourWidth = scrollContainer.scrollWidth / 24;
        const targetHour = Math.max(0, currentHour - 1);
        scrollContainer.scrollTo({ left: - (targetHour * hourWidth), behavior: "smooth" });
    }
    return () => clearInterval(interval);
  }, []);

  // --- Interaction Helpers ---
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, event: CalendarEvent) => {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          onEventLongPress(event);
      }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent, event: CalendarEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (!isLongPress.current) onEventClick(event);
  };

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); 
    const diff = (day + 1) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
  const isToday = (date: Date) => new Date().toDateString() === date.toDateString();

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments.find(d => d.id === event.department_id);
    const baseColor = dept ? dept.color : "#6b7280"; 
    
    if (event.status === 'pending') {
      return { backgroundColor: `${baseColor}40`, border: `1px dashed ${baseColor}`, color: '#fef08a' };
    }
    if (event.status === 'rejected') {
      return { backgroundColor: '#000000', color: '#9ca3af', textDecoration: 'line-through' };
    }
    return { backgroundColor: `${baseColor}60`, color: "#e5e7eb", borderLeft: `3px solid ${baseColor}` };
  };

  return (
    <>
      {/* Rotation Toggle Button (Mobile Only) */}
      <button 
        onClick={() => setIsLandscape(!isLandscape)}
        className="fixed bottom-20 left-4 z-50 md:hidden p-3 bg-blue-600 text-white rounded-full shadow-2xl border border-white/20 hover:scale-110 transition-transform"
        title="چرخش صفحه"
      >
        {isLandscape ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
      </button>

      <div 
        className={clsx(
          "flex flex-1 overflow-hidden relative transition-all duration-300 bg-[#020205]",
          isLandscape && "fixed inset-0 z-[100] w-[100vh] h-[100vw] rotate-90 origin-bottom-left -translate-y-full"
        )}
        onMouseLeave={() => { setHoveredDayIndex(null); setHoveredHour(null); }}
      >
          {/* SIDEBAR (Days) */}
          <div className="w-24 sm:w-32 flex flex-col border-l border-white/10 bg-black/40 backdrop-blur-md z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative">
            <div className="h-12 border-b border-white/10 bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400 shadow-sm">
                {isLandscape ? "هفته جاری" : "تمام روز"}
            </div>
            
            {weekDays.map((dayDate, i) => {
              const dateStr = dayDate.toISOString().split('T')[0];
              const holidayObj = holidays.find(h => h.holiday_date.split('T')[0] === dateStr);
              const allDayEvents = events.filter(e => e.is_all_day && new Date(e.start_time).toDateString() === dayDate.toDateString() && (!e.department_id || !hiddenDeptIds.includes(e.department_id)));

              return (
                <div key={i} className={clsx("flex-1 flex flex-row items-stretch border-b border-white/10 relative transition-all gap-1 group", isToday(dayDate) && "bg-white/5", hoveredDayIndex === i && "bg-white/10")}>
                  
                  <div className="flex flex-row items-center justify-between shrink-0 border-l border-white/5 bg-black/20 w-8 sm:w-10">
                      <div className="flex flex-col items-center justify-center w-full">
                          <span className="text-[9px] sm:text-[10px] font-bold">{WEEK_DAYS[i]}</span>
                          <span className="text-[9px] sm:text-xs opacity-70 mt-0.5">{dayDate.toLocaleDateString("fa-IR-u-nu-arab", { day: "numeric" })}</span>
                      </div>
                      {holidayObj && (
                          <div className="h-full flex items-center justify-center pt-1 pb-1">
                              <span className="text-[8px] sm:text-[9px] text-red-400/80 font-bold whitespace-nowrap tracking-tight" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                                  {holidayObj.occasion}
                              </span>
                          </div>
                      )}
                  </div>

                  <div className="flex-1 flex flex-row gap-1 items-center justify-start overflow-hidden px-1">
                    {allDayEvents.map(ev => (
                        <div key={ev.id} onMouseDown={(e) => handleTouchStart(e, ev)} onMouseUp={(e) => handleTouchEnd(e, ev)} onTouchStart={(e) => handleTouchStart(e, ev)} onTouchEnd={(e) => handleTouchEnd(e, ev)} 
                             className="h-[90%] w-[6px] rounded-full cursor-pointer" style={{ backgroundColor: getEventStyle(ev).backgroundColor }} title={ev.title}></div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TIMELINE */}
          <div className="flex-1 flex flex-col min-w-0 relative overflow-x-auto custom-scrollbar" ref={scrollRef}>
            <div className="flex h-12 border-b border-white/10 bg-white/5 select-none min-w-[1200px] sticky top-0 z-10 backdrop-blur-md shadow-sm">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className={clsx("flex-1 flex items-center justify-start text-[10px] font-medium text-gray-500 border-l border-white/10 px-2", hoveredHour === i && "bg-white/10")}>
                  {toPersianDigits(i)}:{toPersianDigits("00")}
                </div>
              ))}
            </div>

            <div className="flex-1 flex flex-col relative min-w-[1200px]">
              <div className="absolute inset-0 flex pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => <div key={i} className="flex-1 border-l border-white/5 h-full"></div>)}
              </div>

              {weekDays.map((dayDate, dayIndex) => {
                const dayEvents = events.filter(e => {
                  const eStart = new Date(e.start_time).getTime();
                  const eEnd = new Date(e.end_time).getTime();
                  const dStart = dayDate.getTime();
                  const dEnd = dStart + 86400000;
                  if (e.department_id && hiddenDeptIds.includes(e.department_id)) return false;
                  return eStart < dEnd && eEnd > dStart && !e.is_all_day;
                });
                const visualEvents = calculateEventLayout(dayEvents.map(e => {
                   const eStart = new Date(e.start_time).getTime();
                   const eEnd = new Date(e.end_time).getTime();
                   const visualStart = Math.max(eStart, dayDate.getTime());
                   const visualEnd = Math.min(eEnd, dayDate.getTime() + 86400000);
                   return { ...e, start_time: new Date(visualStart).toISOString(), end_time: new Date(visualEnd).toISOString() };
                }));

                const isDraftDay = draftEvent && draftEvent.date.toDateString() === dayDate.toDateString();

                return (
                  <div key={dayIndex} className={clsx("flex-1 border-b border-white/5 relative group min-h-[60px]", hoveredDayIndex === dayIndex && "bg-white/[0.03]")}>
                    <div className="absolute inset-0 flex z-0">
                      {Array.from({ length: 24 }).map((_, h) => (
                         <div key={h} className="flex-1 h-full border-r border-white/5 cursor-pointer hover:bg-white/[0.02]" 
                              onMouseEnter={() => { setHoveredDayIndex(dayIndex); setHoveredHour(h); }}
                              onClick={() => onSlotClick(dayDate, h)} />
                      ))}
                    </div>

                    {isDraftDay && (
                        <div 
                          className="absolute z-20 h-[80%] top-[10%] bg-emerald-500/20 border-2 border-dashed border-emerald-500 rounded flex items-center justify-center animate-pulse cursor-pointer"
                          style={{
                              right: `${(draftEvent!.startHour / 24) * 100}%`,
                              width: `${((draftEvent!.endHour - draftEvent!.startHour) / 24) * 100}%`
                          }}
                          onClick={() => onSlotClick(dayDate, draftEvent!.startHour)}
                        >
                            <Plus className="text-emerald-400" size={20} />
                        </div>
                    )}

                    {visualEvents.map((event) => {
                      const originalEvent = dayEvents.find(e => e.id === event.id);
                      if(!originalEvent) return null;
                      const style = getEventStyle(originalEvent);
                      const laneHeightPercent = 100 / event.totalLanes;
                      return (
                        <div 
                          key={event.id} 
                          onMouseDown={(e) => handleTouchStart(e, originalEvent)} 
                          onMouseUp={(e) => handleTouchEnd(e, originalEvent)}
                          onTouchStart={(e) => handleTouchStart(e, originalEvent)} 
                          onTouchEnd={(e) => handleTouchEnd(e, originalEvent)}
                          onMouseEnter={(e) => onEventHover(e, originalEvent)} 
                          onMouseLeave={onEventLeave}
                          className="absolute rounded-sm px-1 flex items-center shadow-lg cursor-pointer hover:brightness-125 z-10 border-y border-r border-white/10 text-[10px]"
                          style={{ right: `${event.right}%`, width: `${event.width}%`, top: `${event.laneIndex * laneHeightPercent}%`, height: `calc(${laneHeightPercent}% - 2px)`, ...style }}>
                          <div className="truncate w-full">{event.title}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    </>
  );
}