"use client";

import { useEffect, useState, useRef } from "react";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits, getPersianWeekday, getPersianMonth } from "@/lib/jalali";
import clsx from "clsx";
import { calculateEventLayout } from "@/lib/eventLayout";
import { Plus } from "lucide-react";

interface MobileGridProps {
  daysToShow: 1 | 3 | 7;
  startDate: Date; // Controlled by parent
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  hiddenDeptIds: number[];
  
  // Interaction Handlers
  onEventTap: (e: CalendarEvent) => void;
  onEventHold: (e: CalendarEvent) => void;      // Required for gestures
  onEventDragStart: (e: CalendarEvent) => void; // Required for gestures
  
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
  onEventDragStart,
  onSlotClick,
  draftEvent
}: MobileGridProps) {
  // Use client-side only date for "Now" line to avoid hydration mismatch
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // --- Day Logic ---
  const days: Date[] = [];
  if (daysToShow === 1) {
      days.push(new Date(startDate));
  } else if (daysToShow === 3) {
      // 3 Day View: Center the startDate
      for (let i = -1; i <= 1; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          days.push(d);
      }
  } else if (daysToShow === 7) {
      // 7 Day View: Start from startDate
      for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          days.push(d);
      }
  }

  // --- Gesture Logic ---
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const isHolding = useRef(false);
  const hasMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent, event: CalendarEvent) => {
      e.stopPropagation(); // Stop propagation so InfiniteSwiper doesn't move
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isHolding.current = false;
      hasMoved.current = false;
      
      holdTimer.current = setTimeout(() => {
          isHolding.current = true;
          if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent, event: CalendarEvent) => {
      if (!touchStartPos.current) return;
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);

      if (dx > 10 || dy > 10) {
          hasMoved.current = true;
          if (isHolding.current) {
              if (holdTimer.current) clearTimeout(holdTimer.current);
              onEventDragStart(event);
              touchStartPos.current = null;
              isHolding.current = false;
          } else {
              if (holdTimer.current) clearTimeout(holdTimer.current);
          }
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
    const dept = departments.find(d => d.id === event.department_id);
    const baseColor = dept ? dept.color : "#6b7280"; 
    
    if (event.status === 'pending') {
        return { backgroundColor: `${baseColor}20`, border: `1px dashed ${baseColor}`, color: baseColor };
    }
    return { backgroundColor: `${baseColor}90`, color: "#fff", borderRight: `2px solid ${baseColor}` };
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] select-none relative">
        {/* HEADER */}
        <div className="flex flex-row-reverse border-b border-white/10 h-14 bg-white/5 shrink-0 z-20 relative">
            <div className="w-10 border-l border-white/10 bg-black/20"></div>
            {days.map((day, i) => {
                const isToday = now && day.toDateString() === now.toDateString();
                const dateStr = day.toISOString().split('T')[0];
                const holiday = holidays.find(h => h.holiday_date.split('T')[0] === dateStr);
                const dayNum = new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(day);
                
                return (
                    <div key={i} className={clsx("flex-1 flex flex-col items-center justify-center border-r border-white/10 relative overflow-hidden", isToday && "bg-white/5")}>
                        <span className={clsx("text-[10px] font-bold", isToday ? "text-blue-400" : "text-gray-400")}>{getPersianWeekday(day, true)}</span>
                        <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold mt-1", isToday ? "bg-blue-600 text-white shadow-lg" : "text-gray-200")}>{dayNum}</div>
                        {holiday && <div className="absolute bottom-0 w-full h-0.5 bg-red-500"></div>}
                    </div>
                );
            })}
        </div>

        {/* BODY */}
        <div className="flex flex-1 flex-row-reverse relative overflow-hidden">
            {/* Time Column */}
            <div className="w-10 flex flex-col border-l border-white/10 bg-black/20 z-10 shrink-0">
                {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 flex items-center justify-center border-b border-white/5 text-[10px] text-gray-500 font-mono relative">
                        <span className="absolute -top-2">{toPersianDigits(h)}</span>
                    </div>
                ))}
            </div>

            {/* Grid Columns */}
            {days.map((day, i) => {
                const dayEvents = events.filter(e => {
                    const eStart = new Date(e.start_time);
                    return !e.is_all_day && eStart.toDateString() === day.toDateString() && (!e.department_id || !hiddenDeptIds.includes(e.department_id));
                });
                const visualEvents = calculateEventLayout(dayEvents);

                return (
                    <div key={i} className="flex-1 relative border-r border-white/10 h-full">
                        {/* Slots */}
                        <div className="absolute inset-0 flex flex-col z-0">
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} className="flex-1 border-b border-white/5" onClick={() => onSlotClick(day, h)}></div>
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
                            const topPercent = (startMin / 1440) * 100;
                            const heightPercent = ((endMin - startMin) / 1440) * 100;

                            return (
                                <div key={ev.id} onTouchStart={(e) => handleTouchStart(e, original)} onTouchMove={(e) => handleTouchMove(e, original)} onTouchEnd={(e) => handleTouchEnd(e, original)}
                                    className="absolute z-10 px-1.5 py-1 flex flex-col overflow-hidden shadow-sm cursor-pointer rounded bg-blue-600/90 text-white border-r-2 border-blue-400"
                                    style={{ top: `${topPercent}%`, height: `max(20px, ${heightPercent}%)`, right: `${ev.right}%`, width: `${ev.width}%`, ...getEventStyle(original) }}>
                                    <span className="font-bold text-[10px] leading-tight truncate">{original.title}</span>
                                </div>
                            );
                        })}
                        
                        {/* Draft Placeholder */}
                        {draftEvent && draftEvent.date.toDateString() === day.toDateString() && (
                            <div className="absolute z-20 left-1 right-1 rounded-lg border-2 border-dashed border-emerald-500 bg-emerald-500/10 flex items-center justify-center animate-bounce"
                                style={{ top: `${(draftEvent.startHour / 24) * 100}%`, height: `${((draftEvent.endHour - draftEvent.startHour) / 24) * 100}%`, animationDuration: '2s' }}>
                                <Plus className="text-emerald-400 animate-pulse" size={20} />
                            </div>
                        )}
                        
                        {/* Current Time Line */}
                        {now && day.toDateString() === now.toDateString() && (
                             <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none" style={{ top: `${(now.getHours() * 60 + now.getMinutes()) / 1440 * 100}%` }}>
                                 <div className="absolute right-[-4px] -top-[2.5px] w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                             </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
}