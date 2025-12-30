"use client";

import { useEffect, useState, useRef } from "react";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits, getPersianWeekday, getPersianMonth } from "@/lib/jalali";
import clsx from "clsx";
import { calculateEventLayout } from "@/lib/eventLayout";
import { Plus } from "lucide-react";

interface MobileGridProps {
  daysToShow: 1 | 3 | 7;
  currentDate: Date;
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  hiddenDeptIds: number[];
  
  // New Interaction Props
  onEventTap: (e: CalendarEvent) => void;
  onEventHold: (e: CalendarEvent) => void;
  onEventDragStart: (e: CalendarEvent) => void;
  
  onSlotClick: (date: Date, hour: number) => void;
  draftEvent: { date: Date; startHour: number; endHour: number } | null;
}

export default function MobileGrid({
  daysToShow,
  currentDate,
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
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // --- SMART GESTURE LOGIC ---
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const isHolding = useRef(false);
  const hasMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent, event: CalendarEvent) => {
      // 1. Reset
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isHolding.current = false;
      hasMoved.current = false;

      // 2. Start Hold Timer (500ms)
      holdTimer.current = setTimeout(() => {
          isHolding.current = true;
          // Trigger Haptic if available
          if (navigator.vibrate) navigator.vibrate(50);
          
          // Visual Pop logic handled by parent state usually, 
          // but here we just prepare the logic.
          // We wait for move to trigger drag, or release to trigger menu.
      }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent, event: CalendarEvent) => {
      if (!touchStartPos.current) return;
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);

      // If moved > 10px, it's a scroll or drag
      if (dx > 10 || dy > 10) {
          hasMoved.current = true;
          
          if (isHolding.current) {
              // HELD + MOVED = DRAG START
              if (holdTimer.current) clearTimeout(holdTimer.current);
              onEventDragStart(event);
              // Reset so we don't trigger multiple times
              touchStartPos.current = null;
              isHolding.current = false;
          } else {
              // Moved before hold complete = Cancel Hold (It's a scroll)
              if (holdTimer.current) clearTimeout(holdTimer.current);
          }
      }
  };

  const handleTouchEnd = (e: React.TouchEvent, event: CalendarEvent) => {
      if (holdTimer.current) clearTimeout(holdTimer.current);

      if (isHolding.current && !hasMoved.current) {
          // HELD + NO MOVE = LONG PRESS (Menu)
          onEventHold(event);
      } else if (!isHolding.current && !hasMoved.current) {
          // QUICK TAP = CLICK (Properties)
          onEventTap(event);
      }
      
      // Cleanup
      touchStartPos.current = null;
      isHolding.current = false;
      hasMoved.current = false;
  };

  // --- Day Generation Logic ---
  const days = [];
  if (daysToShow === 1) days.push(new Date(currentDate));
  else if (daysToShow === 3) {
    for (let i = -1; i <= 1; i++) {
        const d = new Date(currentDate); d.setDate(d.getDate() + i); days.push(d);
    }
  } else if (daysToShow === 7) {
    const start = new Date(currentDate);
    const day = start.getDay(); 
    const diff = (day + 1) % 7; 
    start.setDate(start.getDate() - diff);
    for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(d.getDate() + i); days.push(d);
    }
  }

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments.find(d => d.id === event.department_id);
    const baseColor = dept ? dept.color : "#6b7280"; 
    
    if (event.status === 'pending') {
        return { backgroundColor: `${baseColor}20`, border: `1px dashed ${baseColor}`, color: baseColor };
    }
    return { backgroundColor: `${baseColor}90`, color: "#fff", borderRight: `2px solid ${baseColor}` };
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-black/20 select-none">
        {/* HEADER */}
        <div className="flex flex-row-reverse border-b border-white/10 h-14 bg-white/5 shrink-0">
            <div className="w-10 border-l border-white/10 bg-black/40"></div>
            {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const dateStr = day.toISOString().split('T')[0];
                const holiday = holidays.find(h => h.holiday_date.split('T')[0] === dateStr);
                const dayNum = new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(day);
                
                return (
                    <div key={i} className={clsx("flex-1 flex flex-col items-center justify-center border-r border-white/10 relative overflow-hidden", isToday && "bg-white/5")}>
                        <span className={clsx("text-[10px] font-bold", isToday ? "text-blue-400" : "text-gray-300")}>{getPersianWeekday(day, true)}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                             <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center text-[10px]", isToday && "bg-blue-600 text-white shadow-lg")}>{dayNum}</div>
                             {(i === 0 || dayNum === "۱") && <span className="text-[8px] text-gray-500 opacity-80">{getPersianMonth(day)}</span>}
                        </div>
                        {holiday && <div className="absolute bottom-0 w-full h-0.5 bg-red-500"></div>}
                    </div>
                );
            })}
        </div>

        {/* BODY */}
        <div className="flex flex-1 flex-row-reverse relative overflow-hidden">
            <div className="w-10 flex flex-col border-l border-white/10 bg-black/40 z-10 shrink-0">
                {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 flex items-center justify-center border-b border-white/5 text-[9px] text-gray-500 font-mono relative">
                        <span className="absolute -top-2">{toPersianDigits(h)}</span>
                    </div>
                ))}
            </div>

            {days.map((day, i) => {
                const dayEvents = events.filter(e => {
                    if (e.is_all_day) return false;
                    const eStart = new Date(e.start_time);
                    return eStart.toDateString() === day.toDateString() && (!e.department_id || !hiddenDeptIds.includes(e.department_id));
                });
                const visualEvents = calculateEventLayout(dayEvents);

                return (
                    <div key={i} className="flex-1 relative border-r border-white/10 h-full group">
                        <div className="absolute inset-0 flex flex-col z-0">
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} className="flex-1 border-b border-white/5 active:bg-white/10 transition-colors" onClick={() => onSlotClick(day, h)}></div>
                            ))}
                        </div>

                        {/* Drag Draft / Pending Drop Placeholder */}
                        {draftEvent && draftEvent.date.toDateString() === day.toDateString() && (
                            <div 
                                className="absolute z-20 left-0.5 right-0.5 bg-emerald-500/20 border-2 border-dashed border-emerald-500 rounded flex items-center justify-center animate-pulse cursor-pointer"
                                style={{ top: `${(draftEvent.startHour / 24) * 100}%`, height: `${((draftEvent.endHour - draftEvent.startHour) / 24) * 100}%` }}
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
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const end = new Date(original.end_time);
                            const endMin = end.getHours() * 60 + end.getMinutes();
                            const topPercent = (startMin / 1440) * 100;
                            const heightPercent = ((endMin - startMin) / 1440) * 100;
                            
                            // Fill logic
                            const isSingle = ev.totalLanes === 1;
                            const width = isSingle ? '96%' : `${ev.width}%`;
                            const right = isSingle ? '2%' : `${ev.right}%`;

                            return (
                                <div
                                    key={ev.id}
                                    onTouchStart={(e) => handleTouchStart(e, original)}
                                    onTouchMove={(e) => handleTouchMove(e, original)}
                                    onTouchEnd={(e) => handleTouchEnd(e, original)}
                                    className="absolute z-10 px-1 py-0.5 flex flex-col overflow-hidden shadow-sm cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                                    style={{
                                        top: `${topPercent}%`,
                                        height: `max(18px, ${heightPercent}%)`,
                                        right: right, 
                                        width: width,
                                        fontSize: daysToShow === 7 ? '8px' : '10px',
                                        lineHeight: '1.1',
                                        borderRadius: '3px',
                                        ...style
                                    }}
                                >
                                    <span className="font-bold break-words whitespace-normal line-clamp-2 leading-tight">{original.title}</span>
                                    {heightPercent > 2 && daysToShow !== 7 && (
                                        <span className="opacity-80 text-[8px] mt-0.5 block">
                                            {toPersianDigits(start.toLocaleTimeString('en-US', {hour12: false, hour:'2-digit', minute:'2-digit'}))}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        {day.toDateString() === now.toDateString() && (
                             <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none shadow-[0_0_4px_rgba(239,68,68,0.8)]" style={{ top: `${(now.getHours() * 60 + now.getMinutes()) / 1440 * 100}%` }}>
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