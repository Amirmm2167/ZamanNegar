"use client";

import { CalendarEvent, Department } from "@/types";
import { toPersianDigits, getPersianWeekday, getPersianMonth } from "@/lib/jalali";
import clsx from "clsx";
import { calculateEventLayout } from "@/lib/eventLayout";
import { Plus } from "lucide-react";

interface MobileGridProps {
  daysToShow: 1 | 3 | 7;
  startDate: Date; // The anchor date for this specific panel
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  hiddenDeptIds: number[];
  
  // Interaction Handlers
  onEventTap: (e: CalendarEvent) => void;
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
  onSlotClick,
  draftEvent
}: MobileGridProps) {
  // We use a fixed "now" for rendering the current time line to prevent hydration errors.
  // In a real app, you might pass "now" as a prop from the parent.
  const now = new Date();

  // --- Day Generation (Pure Logic) ---
  const days: Date[] = [];
  
  if (daysToShow === 1) {
      // 1 Day View: Just the start date
      days.push(new Date(startDate));
  } else if (daysToShow === 3) {
      // 3 Day View: Center the startDate (Yesterday, TODAY, Tomorrow)
      for (let i = -1; i <= 1; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          days.push(d);
      }
  } else if (daysToShow === 7) {
      // 7 Day View: startDate is the anchor, usually start of week
      for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          days.push(d);
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
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#121212] select-none border-x border-white/5">
        
        {/* HEADER */}
        <div className="flex flex-row-reverse border-b border-white/10 h-14 bg-white/5 shrink-0">
            <div className="w-10 border-l border-white/10 bg-black/20"></div>
            {days.map((day, i) => {
                const isToday = day.toDateString() === now.toDateString();
                const dateStr = day.toISOString().split('T')[0];
                const holiday = holidays.find(h => h.holiday_date.split('T')[0] === dateStr);
                const dayNum = new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(day);
                
                return (
                    <div key={i} className={clsx("flex-1 flex flex-col items-center justify-center border-r border-white/10 relative overflow-hidden", isToday && "bg-white/5")}>
                        <span className={clsx("text-[10px] font-bold", isToday ? "text-blue-400" : "text-gray-400")}>
                            {getPersianWeekday(day, true)}
                        </span>
                        
                        <div className="flex items-center gap-1 mt-0.5">
                             <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold", isToday ? "bg-blue-600 text-white shadow-lg" : "text-gray-200")}>
                                {dayNum}
                             </div>
                             {/* Show Month for first day or 1st of month */}
                             {(i === 0 || dayNum === "۱") && (
                                <span className="text-[9px] text-gray-500">{getPersianMonth(day)}</span>
                             )}
                        </div>

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
                    if (e.is_all_day) return false;
                    const eStart = new Date(e.start_time);
                    return eStart.toDateString() === day.toDateString() && (!e.department_id || !hiddenDeptIds.includes(e.department_id));
                });

                const visualEvents = calculateEventLayout(dayEvents);

                return (
                    <div key={i} className="flex-1 relative border-r border-white/10 h-full group">
                        {/* Slots */}
                        <div className="absolute inset-0 flex flex-col z-0">
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} className="flex-1 border-b border-white/5" onClick={() => onSlotClick(day, h)}></div>
                            ))}
                        </div>

                        {/* Draft Placeholder (Waving) */}
                        {draftEvent && draftEvent.date.toDateString() === day.toDateString() && (
                            <div 
                                className="absolute z-20 left-1 right-1 rounded-lg border-2 border-dashed border-emerald-500 bg-emerald-500/10 flex items-center justify-center animate-bounce"
                                style={{
                                    top: `${(draftEvent.startHour / 24) * 100}%`,
                                    height: `${((draftEvent.endHour - draftEvent.startHour) / 24) * 100}%`,
                                    animationDuration: '2s'
                                }}
                                onClick={() => onSlotClick(day, draftEvent.startHour)}
                            >
                                <Plus className="text-emerald-400 animate-pulse" size={20} />
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
                            const isSingle = ev.totalLanes === 1;

                            return (
                                <div
                                    key={ev.id}
                                    onClick={(e) => { e.stopPropagation(); onEventTap(original); }}
                                    className="absolute z-10 px-1.5 py-1 flex flex-col overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-all"
                                    style={{
                                        top: `${topPercent}%`,
                                        height: `max(20px, ${heightPercent}%)`,
                                        right: isSingle ? '2%' : `${ev.right}%`,
                                        width: isSingle ? '96%' : `${ev.width}%`,
                                        fontSize: daysToShow === 7 ? '9px' : '11px',
                                        lineHeight: '1.2',
                                        borderRadius: '4px',
                                        ...style
                                    }}
                                >
                                    <span className="font-bold break-words whitespace-normal line-clamp-2">{original.title}</span>
                                    {heightPercent > 3 && daysToShow !== 7 && (
                                        <span className="opacity-80 text-[9px] mt-0.5 block">
                                            {toPersianDigits(start.toLocaleTimeString('en-US', {hour12: false, hour:'2-digit', minute:'2-digit'}))}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        
                        {/* Current Time Line */}
                        {day.toDateString() === now.toDateString() && (
                             <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none shadow-glow" style={{ top: `${(now.getHours() * 60 + now.getMinutes()) / 1440 * 100}%` }}>
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