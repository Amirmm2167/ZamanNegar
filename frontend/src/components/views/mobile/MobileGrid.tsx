"use client";

import { useEffect, useState, useRef } from "react";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits, getPersianWeekday } from "@/lib/jalali";
import clsx from "clsx";
import { calculateEventLayout } from "@/lib/eventLayout";
import { Plus } from "lucide-react";
import { motion, PanInfo } from "framer-motion"; // Import motion

interface MobileGridProps {
  daysToShow: 1 | 3 | 7;
  startDate: Date;
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  hiddenDeptIds: number[];
  onEventTap: (e: CalendarEvent) => void;
  onEventHold: (e: CalendarEvent) => void;
  // New Prop for Dropping
  onEventDrop: (event: CalendarEvent, newStartDate: Date) => void; 
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
  onEventDrop,
  onSlotClick,
  draftEvent
}: MobileGridProps) {
  const [now, setNow] = useState<Date | null>(null);
  
  // Track which event is currently being dragged (by ID) to unlock it
  const [draggingId, setDraggingId] = useState<number | null>(null);

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

  // --- Drag & Drop Logic ---
  const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, originalEvent: CalendarEvent, dayDate: Date) => {
      setDraggingId(null);
      
      // 1. Calculate the pixel shift
      const yOffset = info.offset.y;
      
      // 2. Convert pixels to minutes (1px = 1min based on our 60px/hr grid)
      // Note: We need to be careful. The element is moving relative to its original TOP.
      // 60px = 60 min.
      // 15 min snap = 15px.
      
      const movedMinutes = Math.round(yOffset / 15) * 15; // Snap to nearest 15m
      
      if (movedMinutes !== 0) {
          // 3. Calculate new Start Time
          const oldStart = new Date(originalEvent.start_time);
          
          // We must ensure we are modifying the date relative to the column (dayDate) 
          // But usually we just shift the time.
          const newStart = new Date(oldStart.getTime() + movedMinutes * 60000);
          
          // Check bounds (00:00 to 23:59)?? 
          // For now, let's just trigger the callback
          if (navigator.vibrate) navigator.vibrate(20);
          onEventDrop(originalEvent, newStart);
      }
  };

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments?.find(d => d.id === event.department_id);
    const baseColor = dept ? dept.color : "#6b7280"; 
    const isPast = new Date(event.end_time) < new Date();
    
    return {
        baseColor,
        isPast,
        style: {
            borderRight: `3px solid ${baseColor}`,
            boxShadow: draggingId === event.id 
                ? '0 10px 20px rgba(0,0,0,0.5)' // Big shadow when dragging
                : '0 1px 3px rgba(0,0,0,0.3)',
            backgroundColor: event.status === 'pending' 
                ? `${baseColor}20` 
                : `${baseColor}${isPast ? '60' : '90'}`,
            color: event.status === 'pending' ? baseColor : "#fff",
            border: event.status === 'pending' ? `1px dashed ${baseColor}` : undefined,
            filter: isPast ? 'grayscale(30%)' : undefined,
            zIndex: draggingId === event.id ? 100 : 10, // Pop to top when dragging
        }
    };
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] select-none relative">
        {/* HEADER */}
        <div className="flex flex-row border-b border-white/10 h-14 bg-white/5 shrink-0 z-20 relative">
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

        {/* BODY */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar touch-pan-y">
            <div className="flex flex-row relative h-[1440px]">
                
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
                                
                                const topPx = startMin; 
                                const heightPx = endMin - startMin;
                                const styleInfo = getEventStyle(original);

                                return (
                                    <motion.div 
                                        key={ev.id} 
                                        // Drag Configuration
                                        drag="y"
                                        dragConstraints={{ top: -topPx, bottom: 1440 - (topPx + heightPx) }} // Keep inside grid
                                        dragElastic={0.05}
                                        dragMomentum={false} // No throwing, pure control
                                        onDragStart={() => {
                                            setDraggingId(original.id);
                                            if(navigator.vibrate) navigator.vibrate(50);
                                        }}
                                        onDragEnd={(e, info) => handleDragEnd(e, info, original, day)}
                                        // Tap Handler (only if not dragged)
                                        onTap={(e, info) => {
                                            if (info.point.x === 0 && info.point.y === 0) {
                                                 // framer motion tap detection logic is usually cleaner
                                                 onEventTap(original);
                                            }
                                        }}
                                        // Visuals
                                        whileDrag={{ scale: 1.05 }}
                                        className="absolute px-1.5 py-1 flex flex-col overflow-hidden shadow-sm cursor-grab active:cursor-grabbing rounded text-[10px]"
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
                                    </motion.div>
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