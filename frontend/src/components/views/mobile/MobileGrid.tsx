"use client";

import { useEffect, useState, useRef } from "react";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits, getPersianWeekday } from "@/lib/jalali";
import clsx from "clsx";
import { calculateEventLayout } from "@/lib/eventLayout";
import { Plus } from "lucide-react";

interface MobileGridProps {
  daysToShow: 1 | 3 | 7;
  startDate: Date;
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  hiddenDeptIds: number[];
  onEventTap: (e: CalendarEvent) => void;
  onEventHold: (e: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
  draftEvent: { date: Date; startHour: number; endHour: number } | null;
}

export default function MobileGrid({
  daysToShow,
  startDate,
  events,
  holidays,
  departments,
  hiddenDeptIds,
  onEventTap,
  onEventHold,
  onSlotClick,
  draftEvent
}: MobileGridProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // --- Day Logic ---
  const days: Date[] = [];
  try {
      if (daysToShow === 1) {
          days.push(new Date(startDate));
      } else if (daysToShow === 3) {
          for (let i = -1; i <= 1; i++) {
              const d = new Date(startDate);
              d.setDate(d.getDate() + i);
              days.push(d);
          }
      } else if (daysToShow === 7) {
          const dayOfWeek = startDate.getDay(); 
          const diff = (dayOfWeek + 1) % 7; 
          const startOfWeek = new Date(startDate);
          startOfWeek.setDate(startOfWeek.getDate() - diff);
          for (let i = 0; i < 7; i++) {
              const d = new Date(startOfWeek);
              d.setDate(d.getDate() + i);
              days.push(d);
          }
      }
  } catch (e) {
      console.error("Error generating dates", e);
  }

  // --- Gesture Logic ---
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const isHolding = useRef(false);
  const hasMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent, event: CalendarEvent) => {
      e.stopPropagation(); 
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isHolding.current = false;
      hasMoved.current = false;
      
      holdTimer.current = setTimeout(() => {
          isHolding.current = true;
          if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartPos.current) return;
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);

      if (dx > 10 || dy > 10) {
          hasMoved.current = true;
          if (holdTimer.current) clearTimeout(holdTimer.current);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent, event: CalendarEvent) => {
      e.stopPropagation();
      if (holdTimer.current) clearTimeout(holdTimer.current);

      if (isHolding.current && !hasMoved.current) {
          onEventHold(event);
      } else if (!isHolding.current && !hasMoved.current) {
          onEventTap(event);
      }
      
      touchStartPos.current = null;
      isHolding.current = false;
      hasMoved.current = false;
  };

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments?.find(d => d.id === event.department_id);
    const baseColor = dept ? dept.color : "#6b7280"; 
    const isPast = new Date(event.end_time) < new Date();
    
    return {
        style: {
            borderRight: `3px solid ${baseColor}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            backgroundColor: event.status === 'pending' 
                ? `${baseColor}20` 
                : `${baseColor}${isPast ? '60' : '90'}`,
            color: event.status === 'pending' ? baseColor : "#fff",
            border: event.status === 'pending' ? `1px dashed ${baseColor}` : undefined,
            filter: isPast ? 'grayscale(30%)' : undefined,
        }
    };
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] select-none relative">
        {/* HEADER */}
        <div className="flex flex-row-reverse border-b border-white/10 h-14 bg-white/5 shrink-0 z-20 relative">
            <div className="w-10 border-l border-white/10 bg-black/20"></div>
            {days.map((day, i) => {
                const isToday = now && day.toDateString() === now.toDateString();
                const dateStr = day.toISOString().split('T')[0];
                const holiday = holidays?.find(h => h.holiday_date.split('T')[0] === dateStr);
                const dayNum = new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(day);
                
                return (
                    <div key={i} className={clsx("flex-1 flex flex-col items-center justify-center border-r border-white/10 relative overflow-hidden", isToday && "bg-white/5")}>
                        <span className={clsx("text-[10px] font-bold", isToday ? "text-blue-400" : "text-gray-400")}>{getPersianWeekday(day, true)}</span>
                        <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold mt-1 transition-all", isToday ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "text-gray-200")}>{dayNum}</div>
                        {holiday && <div className="absolute bottom-0 w-full h-0.5 bg-red-500"></div>}
                    </div>
                );
            })}
        </div>

        {/* BODY - FIX: Added overflow-y-auto and touch-pan-y */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar touch-pan-y">
            {/* FIX: Fixed height 1440px to ensure px calculations are correct */}
            <div className="flex flex-row-reverse relative h-[1440px]">
                
                {/* Time Column */}
                <div className="w-10 flex flex-col border-l border-white/10 bg-black/20 z-10 shrink-0 sticky left-0">
                    {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="h-[60px] flex items-start justify-center border-b border-white/5 text-[10px] text-gray-500 font-mono relative pt-1 shrink-0">
                            <span className="absolute -top-2 bg-[#121212] px-1 rounded">{toPersianDigits(h)}</span>
                        </div>
                    ))}
                </div>

                {/* Grid Columns */}
                {days.map((day, i) => {
                    const dayEvents = events?.filter(e => {
                        const eStart = new Date(e.start_time);
                        return !e.is_all_day && eStart.toDateString() === day.toDateString() && (!e.department_id || !hiddenDeptIds.includes(e.department_id));
                    }) || [];
                    
                    const visualEvents = calculateEventLayout(dayEvents);

                    return (
                        <div key={i} className="flex-1 relative border-r border-white/10 h-full">
                            {/* Slots */}
                            <div className="absolute inset-0 flex flex-col z-0">
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <div key={h} className="h-[60px] border-b border-white/5 active:bg-white/5 transition-colors shrink-0" onClick={() => onSlotClick(day, h)}></div>
                                ))}
                            </div>

                            {/* Events */}
                            {visualEvents.map((ev) => {
                                const original = dayEvents.find(e => e.id === ev.id);
                                if(!original) return null;
                                const start = new Date(original.start_time);
                                const startMin = start.getHours() * 60 + start.getMinutes();
                                const end = new Date(original.end_time);
                                const endMin = end.getHours() * 60 + end.getMinutes();
                                
                                // FIX: Use pixels instead of percentage
                                const topPx = startMin; 
                                const heightPx = endMin - startMin;
                                const styleInfo = getEventStyle(original);

                                return (
                                    <div 
                                        key={ev.id} 
                                        onTouchStart={(e) => handleTouchStart(e, original)} 
                                        onTouchMove={(e) => handleTouchMove(e)} 
                                        onTouchEnd={(e) => handleTouchEnd(e, original)}
                                        className="absolute px-1.5 py-1 flex flex-col overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform rounded text-[10px]"
                                        style={{ 
                                            top: `${topPx}px`, 
                                            height: `max(20px, ${heightPx}px)`, 
                                            right: `${ev.right}%`, 
                                            width: `${ev.width}%`, 
                                            ...styleInfo.style 
                                        }}
                                    >
                                        <span className="font-bold leading-tight truncate pointer-events-none">{original.title}</span>
                                        <span className="text-[9px] opacity-80 pointer-events-none">
                                            {toPersianDigits(`${start.getHours()}:${String(start.getMinutes()).padStart(2,'0')}`)}
                                        </span>
                                    </div>
                                );
                            })}
                            
                            {/* Draft Placeholder */}
                            {draftEvent && draftEvent.date.toDateString() === day.toDateString() && (
                                <div className="absolute z-20 left-1 right-1 rounded-lg border-2 border-dashed border-emerald-500 bg-emerald-500/10 flex items-center justify-center animate-bounce"
                                    style={{ 
                                        top: `${draftEvent.startHour * 60}px`, 
                                        height: `${(draftEvent.endHour - draftEvent.startHour) * 60}px` 
                                    }}>
                                    <Plus className="text-emerald-400 animate-pulse" size={20} />
                                </div>
                            )}
                            
                            {/* Current Time Line */}
                            {now && day.toDateString() === now.toDateString() && (
                                <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none" 
                                     style={{ top: `${now.getHours() * 60 + now.getMinutes()}px` }}>
                                     <div className="absolute right-[-5px] -top-[4.5px] w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                                     </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
}