"use client";

import { useMemo } from "react";
import { 
  getJalaliDay, 
  getStartOfJalaliMonth, 
  toPersianDigits, 
  isSameJalaliDay, 
  addJalaliDays 
} from "@/lib/jalali";
import clsx from "clsx";

interface MiniMonthProps {
  monthDate: Date; // Any date in this month
  densityMap: Record<string, number>;
  onDayClick: (date: Date) => void;
  onDayDoubleClick: (date: Date) => void;
}

export default function MiniMonth({
  monthDate,
  densityMap,
  onDayClick,
  onDayDoubleClick
}: MiniMonthProps) {
  
  const monthName = new Intl.DateTimeFormat("fa-IR", { month: "long" }).format(monthDate);
  const today = new Date();

  // Generate 42-day Grid for this Jalali Month
  const days = useMemo(() => {
    const startOfMonth = getStartOfJalaliMonth(monthDate);
    // Jalali Week: Sat=0 ... Fri=6
    // We need to find how many days to pad before the 1st
    const dayOfWeek = startOfMonth.getDay(); // 0(Sun)..6(Sat)
    
    // Convert Gregorian Day to Jalali Offset (Sat is start)
    // Greg: Sat(6)->0, Sun(0)->1, Mon(1)->2 ... Fri(5)->6
    const jalaliOffset = (dayOfWeek + 1) % 7; 
    
    const startOfGrid = addJalaliDays(startOfMonth, -jalaliOffset);
    
    return Array.from({ length: 42 }).map((_, i) => 
      addJalaliDays(startOfGrid, i)
    );
  }, [monthDate]);

  const getIntensity = (count: number) => {
    if (!count) return "bg-transparent text-gray-500 hover:bg-white/5";
    if (count >= 5) return "bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/40"; 
    if (count >= 3) return "bg-blue-600/70 text-white"; 
    return "bg-blue-600/30 text-blue-200"; 
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="text-right font-bold text-gray-300 mb-2 text-sm px-1 border-b border-white/5 pb-1">
        {monthName}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-1" dir="rtl">
        {days.map((date, i) => {
          const dateKey = date.toISOString().split("T")[0];
          const count = densityMap[dateKey] || 0;
          
          // Check if this day actually belongs to the month we are rendering
          // (Simple check: Compare Month Index)
          // Note: getStartOfJalaliMonth returns the 1st of the Jalali month
          const isCurrentMonth = getStartOfJalaliMonth(date).getTime() === getStartOfJalaliMonth(monthDate).getTime();
          const isToday = isSameJalaliDay(date, today);

          return (
            <div
              key={i}
              onClick={() => onDayClick(date)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onDayDoubleClick(date);
              }}
              className={clsx(
                "flex items-center justify-center rounded-md text-[10px] cursor-pointer transition-all relative group",
                !isCurrentMonth ? "opacity-0 pointer-events-none" : "opacity-100", // Hide padding days for cleaner look
                getIntensity(count),
                isToday && "ring-1 ring-amber-500 z-10 font-bold text-amber-400"
              )}
            >
              {isCurrentMonth && toPersianDigits(getJalaliDay(date))}
              
              {/* Tooltip */}
              {count > 0 && isCurrentMonth && (
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black/90 border border-white/10 text-white text-[9px] px-2 py-1 rounded shadow-xl z-20 whitespace-nowrap pointer-events-none">
                  {toPersianDigits(count)} رویداد
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}