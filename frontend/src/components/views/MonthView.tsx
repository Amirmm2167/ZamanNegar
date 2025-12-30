"use client";

import { useState, useRef } from "react";
import { CalendarEvent, Department } from "@/types";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  onEventClick: (e: CalendarEvent) => void;
  onEventLongPress: (e: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void; // Clicking a day opens modal for 9AM
}

export default function MonthView({
  currentDate,
  events,
  holidays,
  departments,
  onEventClick,
  onEventLongPress,
  onSlotClick
}: MonthViewProps) {
  const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

  // Interaction Helpers
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

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Adjust for Persian week start (Saturday = 6 in JS getDay() usually? No, Sat=6, Sun=0)
    // We want Saturday to be index 0.
    // JS: Sun=0, Mon=1 ... Sat=6.
    // Mapping: Sat(6)->0, Sun(0)->1, Mon(1)->2 ...
    const startDayIndex = (firstDay.getDay() + 1) % 7; 
    
    const days = [];
    
    // Previous Month padding
    for (let i = 0; i < startDayIndex; i++) {
        const d = new Date(firstDay);
        d.setDate(d.getDate() - (startDayIndex - i));
        days.push({ date: d, isCurrentMonth: false });
    }
    
    // Current Month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next Month padding
    const remaining = 42 - days.length; // 6 rows * 7 cols
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(lastDay);
        d.setDate(d.getDate() + i);
        days.push({ date: d, isCurrentMonth: false });
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="h-full flex flex-col bg-black/20">
      {/* Header Row */}
      <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
        {WEEK_DAYS.map((day, i) => (
          <div key={i} className="py-2 text-center text-xs font-bold text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((dayObj, i) => {
          const dateStr = dayObj.date.toISOString().split('T')[0];
          const isToday = dayObj.date.toDateString() === new Date().toDateString();
          const holiday = holidays.find(h => h.holiday_date.split('T')[0] === dateStr);
          
          const dayEvents = events.filter(e => new Date(e.start_time).toDateString() === dayObj.date.toDateString());
          
          return (
            <div 
                key={i} 
                className={clsx(
                    "border-b border-r border-white/10 relative p-1 flex flex-col gap-1 transition-colors hover:bg-white/[0.02]",
                    !dayObj.isCurrentMonth && "opacity-30 grayscale bg-black/20",
                    isToday && "bg-blue-900/10 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]"
                )}
                onClick={() => onSlotClick(dayObj.date, 9)} // Default to 9 AM click
            >
                {/* Date Number */}
                <div className="flex justify-between items-start">
                    <span className={clsx(
                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                        isToday ? "bg-blue-600 text-white shadow-lg" : "text-gray-300",
                        holiday && !isToday && "text-red-400"
                    )}>
                        {dayObj.date.toLocaleDateString("fa-IR-u-nu-arab", { day: 'numeric' })}
                    </span>
                </div>

                {/* Desktop Events (Bars) */}
                <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 4).map(ev => {
                        const dept = departments.find(d => d.id === ev.department_id);
                        return (
                            <div 
                                key={ev.id}
                                onMouseDown={(e) => handleTouchStart(e, ev)} 
                                onMouseUp={(e) => handleTouchEnd(e, ev)}
                                onTouchStart={(e) => handleTouchStart(e, ev)} 
                                onTouchEnd={(e) => handleTouchEnd(e, ev)}
                                onClick={(e) => { e.stopPropagation(); /* Click handled by touch logic */ }}
                                className="hidden sm:block text-[10px] px-1 rounded truncate cursor-pointer hover:brightness-110"
                                style={{ backgroundColor: (dept?.color || '#666') + '90', color: '#fff' }}
                            >
                                {ev.title}
                            </div>
                        );
                    })}
                    {/* Mobile Events (Dots) */}
                    <div className="sm:hidden flex flex-wrap gap-1 content-start mt-1">
                        {dayEvents.map(ev => {
                             const dept = departments.find(d => d.id === ev.department_id);
                             return (
                                <div key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dept?.color || '#666' }}></div>
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