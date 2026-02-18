"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  getJalaliParts, 
  getJalaliYear, 
  addJalaliDays, 
  toPersianDigits 
} from "@/lib/jalali";
import MiniMonth from "./MiniMonth";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

interface YearViewProps {
  currentDate: Date; 
  onDayClick: (date: Date) => void;
  onDayDoubleClick: (date: Date) => void;
}

export default function YearView({
  currentDate,
  onDayClick,
  onDayDoubleClick
}: YearViewProps) {
  
  const { activeCompanyId } = useAuthStore();
  const [densityMap, setDensityMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // 1. Precise Year Calculation
  const { startOfYear, months } = useMemo(() => {
    // Current Jalali Year (e.g. 1403)
    const targetYear = getJalaliYear(currentDate);
    
    // Find the exact Gregorian start of 1403/01/01
    // Strategy: Start from March 15th of the Gregorian year and check forward
    // (Jalali new year is always around March 20-21)
    let pointer = new Date(targetYear + 621, 2, 15); // Approximate conversion base
    
    // Walk forward until we hit 1/1
    for (let i = 0; i < 20; i++) {
        const [py, pm, pd] = getJalaliParts(pointer);
        if (py === targetYear && pm === 1 && pd === 1) {
            break;
        }
        pointer.setDate(pointer.getDate() + 1);
    }
    const yearStart = new Date(pointer);

    // Generate 12 Months
    // To ensure "mapping" is correct, we generate them strictly in order 1..12
    const monthAnchors = [];
    let temp = new Date(yearStart);
    
    for (let i = 0; i < 12; i++) {
        monthAnchors.push(new Date(temp));
        // Add safe buffer to jump to next month (15th of next month)
        // Then rewind to 1st of next month logic in MiniMonth handles the grid
        // Simpler: Just add days roughly. 
        // 1-6 = 31 days, 7-11 = 30 days.
        const daysToAdd = i < 6 ? 31 : 30;
        temp = addJalaliDays(temp, daysToAdd); 
    }

    return { startOfYear: yearStart, months: monthAnchors };
  }, [currentDate]);

  // 2. Fetch Data
  useEffect(() => {
    if (!activeCompanyId) return;
    const fetchDensity = async () => {
      setLoading(true);
      try {
        const start = startOfYear.toISOString();
        const end = addJalaliDays(startOfYear, 366).toISOString();
        const res = await api.get<Record<string, number>>("/events/density", {
            params: { start, end }
        });
        setDensityMap(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDensity();
  }, [activeCompanyId, startOfYear]);

  return (
    <div className="h-full w-full p-6 relative bg-[#020205] overflow-hidden flex flex-col">
      
      {/* Background Year Number */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-black text-white/[0.03] pointer-events-none select-none z-0 tracking-tighter">
        {toPersianDigits(getJalaliYear(currentDate))}
      </div>

      {loading && (
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-blue-400 text-xs backdrop-blur-md z-50 animate-pulse">
            <Loader2 className="animate-spin" size={12} />
            <span>بروزرسانی آمار...</span>
        </div>
      )}

      {/* THE GRID: 10-7-4-1 Layout */}
      <div className="grid grid-rows-3 grid-cols-4 grid-flow-col gap-6 w-full h-full relative z-10" dir="rtl">
        {months.map((m, i) => (
            <div key={i} className="min-h-0 min-w-0 bg-[#121212]/50 rounded-xl border border-white/5 p-2 backdrop-blur-sm"> 
                <MiniMonth 
                    monthDate={m}
                    densityMap={densityMap}
                    onDayClick={onDayClick}
                    onDayDoubleClick={onDayDoubleClick}
                />
            </div>
        ))}
      </div>
    </div>
  );
}