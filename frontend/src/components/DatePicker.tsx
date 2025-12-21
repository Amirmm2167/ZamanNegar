"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";
import clsx from "clsx";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" (Gregorian ISO)
  onChange: (date: string) => void;
  onClose: () => void;
}

export default function DatePicker({ value, onChange, onClose }: DatePickerProps) {
  // State for the *viewing* month (not necessarily selected date)
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  
  const WEEK_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

  // --- JALALI MATH HELPER ---
  // Calculates the 1st day of the current Jalali month in Gregorian
  const getJalaliMonthGrid = (baseDate: Date) => {
    // 1. Get current Jalali Year/Month
    const formatter = new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(baseDate);
    const jYear = parseInt(parts.find(p => p.type === "year")?.value || "1400");
    const jMonth = parseInt(parts.find(p => p.type === "month")?.value || "1");

    // 2. Find the Gregorian date for the 1st of this Jalali month
    // We go back day by day until the Jalali day is 1
    const cursor = new Date(baseDate);
    let safety = 0;
    while (safety < 32) {
      const p = formatter.formatToParts(cursor);
      const d = parseInt(p.find(item => item.type === "day")?.value || "1");
      if (d === 1) break;
      cursor.setDate(cursor.getDate() - 1);
      safety++;
    }
    const startOfMonth = new Date(cursor);

    // 3. Find day of week for the 1st (0=Sat in our grid logic)
    // JS: 0=Sun, 6=Sat. We want Sat=0, Sun=1...
    const dayOfWeek = (startOfMonth.getDay() + 1) % 7;

    // 4. Generate the days
    const days = [];
    // Empty slots before 1st
    for (let i = 0; i < dayOfWeek; i++) {
      days.push(null);
    }
    
    // Fill days until month changes
    const dCursor = new Date(startOfMonth);
    // Jalali months are max 31 days
    for (let i = 1; i <= 31; i++) {
      const p = formatter.formatToParts(dCursor);
      const currentJMonth = parseInt(p.find(item => item.type === "month")?.value || "0");
      
      if (currentJMonth !== jMonth) break; // New month reached

      days.push({
        dateObj: new Date(dCursor),
        jDay: i,
        iso: dCursor.toISOString().split("T")[0]
      });
      dCursor.setDate(dCursor.getDate() + 1);
    }

    return { days, jYear, jMonth };
  };

  const { days, jYear, jMonth } = getJalaliMonthGrid(viewDate);

  const handlePrevMonth = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 30); // Approximate jump back
    // Correct logic: verify we actually changed month index, simplifying for robustness
    setViewDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 30);
    setViewDate(d);
  };

  const getMonthName = (m: number) => {
    const names = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    return names[m - 1] || "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#252526] rounded-xl shadow-2xl overflow-hidden text-gray-100" dir="rtl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#333]">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded"><ChevronRight /></button>
          <div className="font-bold text-lg">
            {getMonthName(jMonth)} {toPersianDigits(jYear)}
          </div>
          <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded"><ChevronLeft /></button>
        </div>

        {/* Grid */}
        <div className="p-4 bg-[#1e1e1e]">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-500 font-bold">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const isSelected = day.iso === value;
              const isToday = day.iso === new Date().toISOString().split("T")[0];

              return (
                <button
                  key={day.iso}
                  onClick={() => {
                    onChange(day.iso);
                    onClose();
                  }}
                  className={clsx(
                    "h-10 w-10 rounded-full flex items-center justify-center text-sm transition-all",
                    isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : 
                    isToday ? "border border-blue-500 text-blue-400" :
                    "hover:bg-[#333] text-gray-300"
                  )}
                >
                  {toPersianDigits(day.jDay)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 bg-[#252526] text-center border-t border-gray-700">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">بستن</button>
        </div>
      </div>
    </div>
  );
}