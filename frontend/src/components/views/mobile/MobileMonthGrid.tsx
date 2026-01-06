"use client";

import { CalendarEvent, Department } from "@/types";
import { toPersianDigits, getPersianWeekday, getStartOfJalaliMonth, isSameJalaliDay } from "@/lib/jalali";
import clsx from "clsx";

interface MobileMonthGridProps {
  startDate: Date; 
  events: CalendarEvent[];
  holidays: any[];
  departments: Department[];
  onDateClick: (date: Date) => void;
}

export default function MobileMonthGrid({
  startDate,
  events,
  holidays,
  departments,
  onDateClick
}: MobileMonthGridProps) {
  const today = new Date();

  // 1. Determine the Jalali Month Grid
  const startOfMonth = getStartOfJalaliMonth(startDate);
  
  // Find start of week (Saturday)
  const startOfGrid = new Date(startOfMonth);
  const dayOfWeek = startOfGrid.getDay(); // Sat=6, Sun=0
  const daysToSubtract = (dayOfWeek + 1) % 7; 
  startOfGrid.setDate(startOfGrid.getDate() - daysToSubtract);

  // Generate 42 days
  const gridDays = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(startOfGrid);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getDayEvents = (date: Date) => {
    return events.filter(e => {
        const eStart = new Date(e.start_time);
        return isSameJalaliDay(eStart, date);
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] select-none p-2">
        {/* Days Header */}
        <div className="flex flex-row mb-2" dir="rtl">
            {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((day, i) => (
                <div key={i} className="flex-1 text-center text-xs text-gray-500 font-bold py-2">
                    {day}
                </div>
            ))}
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1" dir="rtl">
            {gridDays.map((date, i) => {
                const isToday = isSameJalaliDay(date, today);
                const isCurrentMonth = isSameJalaliDay(getStartOfJalaliMonth(date), startOfMonth);
                const dayNum = new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(date);
                const dayEvents = getDayEvents(date);
                const holiday = holidays.find(h => isSameJalaliDay(new Date(h.holiday_date), date));

                return (
                    <div 
                        key={i} 
                        onClick={() => onDateClick(date)}
                        className={clsx(
                            "relative flex flex-col items-center justify-start pt-1 rounded-lg transition-colors cursor-pointer",
                            isCurrentMonth ? "bg-white/[0.03]" : "bg-transparent opacity-30",
                            isToday && "bg-blue-600/10 border border-blue-500/50"
                        )}
                    >
                        <span className={clsx(
                            "text-xs font-medium",
                            isToday ? "text-blue-400 font-bold" : (holiday ? "text-red-400" : "text-gray-300")
                        )}>
                            {dayNum}
                        </span>

                        {/* Event Dots */}
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                            {dayEvents.slice(0, 4).map(ev => {
                                const dept = departments.find(d => d.id === ev.department_id);
                                const color = dept ? dept.color : "#6b7280";
                                return (
                                    <div 
                                        key={ev.id} 
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                );
                            })}
                            {dayEvents.length > 4 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
}