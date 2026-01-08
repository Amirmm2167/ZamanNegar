"use client";

import { CalendarEvent, Department } from "@/types";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";
import { Plus } from "lucide-react";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  onEventClick: (e: CalendarEvent) => void;
  onEventLongPress: (e: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
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

  // Generate Month Grid
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Fill previous month days to align start of week
    const days = [];
    const firstDayIndex = (firstDay.getDay() + 1) % 7; // Align to Saturday
    
    // Prev Month Filler
    for (let i = firstDayIndex; i > 0; i--) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() - i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Current Month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next Month Filler (to complete 42 grid)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(lastDay);
      d.setDate(d.getDate() + i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments.find(d => d.id === event.department_id);
    const color = dept?.color || "#6b7280";
    if (event.status === 'pending') {
        return { 
            bg: `${color}20`, 
            border: color, 
            text: color, 
            opacity: 0.8 
        };
    }
    return { 
        bg: color, 
        border: color, 
        text: '#fff', 
        opacity: 1 
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#020205] select-none">
      
      {/* Header (Days of Week) */}
      <div className="flex border-b border-white/10 bg-black/40 backdrop-blur-md z-10">
        {WEEK_DAYS.map((day, i) => (
          <div key={i} className="flex-1 py-3 text-center text-xs font-bold text-gray-400 border-l border-white/5 last:border-l-0">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {days.map((dayObj, i) => {
          const dateStr = dayObj.date.toISOString().split('T')[0];
          const holiday = holidays.find(h => h.holiday_date.split('T')[0] === dateStr);
          const isToday = dayObj.date.toDateString() === today.toDateString();
          
          // Filter events for this day
          const dayEvents = events.filter(e => 
             new Date(e.start_time).toDateString() === dayObj.date.toDateString()
          ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

          return (
            <div 
              key={i} 
              className={clsx(
                "border-b border-l border-white/5 relative group transition-colors flex flex-col p-1 gap-1 overflow-hidden",
                !dayObj.isCurrentMonth && "bg-white/[0.01] opacity-50 text-gray-600 grayscale",
                dayObj.isCurrentMonth && "hover:bg-white/[0.02]"
              )}
              onClick={() => onSlotClick(dayObj.date, 9)} // Default to 9am click
            >
              
              {/* Date Number */}
              <div className="flex justify-between items-start px-1">
                 <span className={clsx(
                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                    isToday 
                        ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
                        : "text-gray-400"
                 )}>
                    {toPersianDigits(dayObj.date.getDate())}
                 </span>
                 {holiday && (
                    <span className="text-[9px] text-red-400 truncate max-w-[70%] leading-tight bg-red-500/10 px-1.5 py-0.5 rounded">
                       {holiday.occasion}
                    </span>
                 )}
              </div>

              {/* Events List */}
              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                 {dayEvents.slice(0, 4).map(event => {
                    const style = getEventStyle(event);
                    return (
                        <div 
                           key={event.id}
                           onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                           onContextMenu={(e) => { e.preventDefault(); onEventLongPress(event); }}
                           className={clsx(
                               "text-[10px] px-2 py-1 rounded truncate cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex items-center gap-1",
                               event.status === 'pending' && "border border-dashed"
                           )}
                           style={{ 
                               backgroundColor: style.bg, 
                               color: style.text,
                               borderColor: style.border
                           }}
                        >
                           <span className="opacity-70 font-mono text-[9px]">
                              {new Date(event.start_time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute:'2-digit' })}
                           </span>
                           <span className="font-bold truncate">{event.title}</span>
                        </div>
                    );
                 })}
                 {dayEvents.length > 4 && (
                    <div className="text-[10px] text-center text-gray-500 hover:text-white cursor-pointer transition-colors">
                       {toPersianDigits(dayEvents.length - 4)}+ بیشتر
                    </div>
                 )}
              </div>

              {/* Hover Add Button */}
              {dayObj.isCurrentMonth && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-emerald-600/90 text-white p-2 rounded-full shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                          <Plus size={20} />
                      </div>
                  </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}