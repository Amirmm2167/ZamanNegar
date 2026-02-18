"use client";

import { useLayoutStore } from "@/stores/layoutStore";
import { 
  getJalaliDay, 
  getStartOfJalaliMonth, 
  getJalaliParts, 
  toPersianDigits, 
  addJalaliDays,
  isSameJalaliDay 
} from "@/lib/jalali";
import { CalendarEvent, Department } from "@/types";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { useContextMenuStore } from "@/stores/contextMenuStore";

interface MonthViewProps {
  currentDate?: Date;
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  onEventClick: (e: CalendarEvent) => void;
  onEventLongPress: (e: CalendarEvent) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export default function MonthView({
  events,
  holidays,
  departments,
  onEventClick,
  onEventLongPress,
  onSlotClick
}: MonthViewProps) {
  
  const { currentDate } = useLayoutStore();
  const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  const {openMenu} = useContextMenuStore();
  // --- Jalali Grid Generation ---
  const getJalaliMonthGrid = (date: Date) => {
    // 1. Get current Jalali Year/Month
    const [jy, jm] = getJalaliParts(date);
    
    // 2. Find start of this Jalali month
    const startOfMonth = getStartOfJalaliMonth(date);
    
    // 3. Determine length of month (Standard Jalali Logic)
    let daysInMonth = 31;
    if (jm > 6 && jm < 12) daysInMonth = 30;
    if (jm === 12) {
       // Simple Leap year check (approximate for UI)
       // For exactness, we'd need a robust leap checker, but 29 is safe default for Esfand
       // or we can check if start of next month is 30 days away.
       const nextMonth = addJalaliDays(startOfMonth, 30);
       const [ny, nm, nd] = getJalaliParts(nextMonth);
       // If adding 30 days lands on 1st of next year, it was 30 days. 
       // If it lands on 2nd, it was 29.
       daysInMonth = (nd === 1) ? 30 : 29;
    }

    // 4. Build Grid
    const days = [];
    
    // Previous Month padding
    // Jalali Week starts Saturday (0). 
    // If startOfMonth.getDay() is 0 (Saturday), padding is 0.
    // If startOfMonth.getDay() is 1 (Sunday), padding is 1.
    const startDayOfWeek = (startOfMonth.getDay() + 1) % 7; 
    
    for (let i = startDayOfWeek; i > 0; i--) {
      const d = addJalaliDays(startOfMonth, -i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Current Month
    for (let i = 0; i < daysInMonth; i++) {
      const d = addJalaliDays(startOfMonth, i);
      days.push({ date: d, isCurrentMonth: true });
    }
    
    // Next Month padding (up to 42 cells)
    const remaining = 42 - days.length;
    const lastDay = days[days.length - 1].date;
    for (let i = 1; i <= remaining; i++) {
      const d = addJalaliDays(lastDay, i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    return days;
  };

  const days = getJalaliMonthGrid(currentDate);
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
      
      {/* Header */}
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
          const isToday = isSameJalaliDay(dayObj.date, today);
          
          const dayEvents = events.filter(e => 
             isSameJalaliDay(new Date(e.start_time), dayObj.date)
          ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

          return (
            <div 
              key={i} 
              className={clsx(
                "border-b border-l border-white/5 relative group transition-colors flex flex-col p-1 gap-1 overflow-hidden",
                !dayObj.isCurrentMonth && "bg-white/[0.01] opacity-50 text-gray-600 grayscale",
                dayObj.isCurrentMonth && "hover:bg-white/[0.02]"
              )}
              onClick={() => onSlotClick(dayObj.date, 9)} 
              onContextMenu={(e) => openMenu(e,'empty-slot',{date: dayObj.date})}
            >
              
              {/* Date & Holiday */}
              <div className="flex justify-between items-start px-1">
                 <span className={clsx(
                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                    isToday 
                        ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
                        : "text-gray-400"
                 )}>
                    {/* Jalali Day Number */}
                    {toPersianDigits(getJalaliDay(dayObj.date))}
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
                           onContextMenu={(e) => { e.preventDefault(); onEventLongPress(event); openMenu(e,'event', event) }}
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