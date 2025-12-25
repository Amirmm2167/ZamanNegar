"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Loader2, AlertCircle, Plus } from "lucide-react";
import clsx from "clsx";
import { toPersianDigits } from "@/lib/utils";
import EventModal from "./EventModal";
import DigitalClock from "./DigitalClock";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";
import { calculateEventLayout } from "@/lib/eventLayout";

interface Holiday {
  id: number;
  occasion: string;
  holiday_date: string; 
}

// --- HIERARCHY HELPERS ---
const getDescendantIds = (parentId: number, allDepts: Department[]): number[] => {
  let ids = [parentId];
  const children = allDepts.filter(d => d.parent_id === parentId);
  children.forEach(child => {
    ids = [...ids, ...getDescendantIds(child.id, allDepts)];
  });
  return ids;
};

const getAncestors = (deptId: number, allDepts: Department[]): Department[] => {
  const dept = allDepts.find(d => d.id === deptId);
  if (!dept) return [];
  if (!dept.parent_id) return [dept];
  return [...getAncestors(dept.parent_id, allDepts), dept];
};

export interface CalendarGridHandle {
  openNewEventModal: () => void;
}

const CalendarGrid = forwardRef<CalendarGridHandle>((props, ref) => {
  // --- DATA STATE ---
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // --- UI STATE ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userId, setUserId] = useState<number>(0);
  const [now, setNow] = useState(new Date());

  // --- INTERACTION STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 

  // --- TOOLTIP STATE ---
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

  useImperativeHandle(ref, () => ({
    openNewEventModal: () => {
      setSelectedEvent(null);
      setIsModalOpen(true);
    }
  }));

  // --- 1. INIT ---
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. DATA FETCHING ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsRes, holidaysRes, deptsRes, meRes] = await Promise.all([
        api.get<CalendarEvent[]>("/events/"),
        api.get<Holiday[]>("/holidays/"),
        api.get<Department[]>("/departments/"),
        api.get("/auth/me").catch(() => ({ data: { id: 0 } }))
      ]);
      setEvents(eventsRes.data);
      setHolidays(holidaysRes.data);
      setDepartments(deptsRes.data);
      setUserId(meRes.data.id);
    } catch (err) {
      console.error(err);
      setError("خطا در دریافت اطلاعات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const handleEventUpdate = () => { fetchData(); };

  // --- 3. AUTO SCROLL ---
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const currentHour = new Date().getHours();
      const scrollContainer = scrollRef.current;
      const hourWidth = scrollContainer.scrollWidth / 24;
      const targetHour = Math.max(0, currentHour - 1);
      const scrollPos = targetHour * hourWidth;
      scrollContainer.scrollTo({ left: -scrollPos, behavior: "smooth" });
    }
  }, [loading]);

  // --- 4. DATE HELPERS ---
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); 
    const diff = (day + 1) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
  const isToday = (date: Date) => new Date().toDateString() === date.toDateString();
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const goToToday = () => setCurrentDate(new Date());

  // --- 5. FILTER LOGIC ---
  const toggleDeptVisibility = (id: number) => {
    const targetIds = getDescendantIds(id, departments);
    setHiddenDeptIds(prev => {
      const isHidden = prev.includes(id);
      if (isHidden) return prev.filter(hid => !targetIds.includes(hid));
      else return Array.from(new Set([...prev, ...targetIds]));
    });
  };
  const showAllDepts = () => setHiddenDeptIds([]);

  // --- 6. STYLING ENGINE ---
  const getIndicatorPosition = () => {
    const minutes = now.getHours() * 60 + now.getMinutes();
    const percent = (minutes / 1440) * 100;
    return `${percent}%`;
  };

  const getEventStyle = (event: CalendarEvent) => {
    const dept = departments.find(d => d.id === event.department_id);
    const baseColor = dept ? dept.color : "#6b7280"; 

    let boxShadow = 'none';
    if (event.department_id) {
        const ancestors = getAncestors(event.department_id, departments);
        const reversed = [...ancestors].reverse();
        const shadows = reversed.map((d, i) => {
            const width = (i + 1) * 4;
            return `inset ${width}px 0 0 0 ${d.color}`;
        });
        boxShadow = shadows.join(', ');
    }
    
    if (event.status === 'pending') {
      return {
        backgroundImage: `repeating-linear-gradient(45deg, #fef08a10, #fef08a10 10px, #fde04730 10px, #fde04730 20px)`,
        color: '#fef08a', 
        boxShadow: `${boxShadow}, inset 0 0 0 1px #eab308` 
      };
    }
    if (event.status === 'rejected') {
      return {
        backgroundColor: '#000000',
        color: '#9ca3af',
        filter: 'grayscale(100%) opacity(0.7)',
        textDecoration: 'line-through',
        boxShadow: 'inset 4px 0 0 0 #374151' 
      };
    }
    return {
      backgroundColor: `${baseColor}40`, 
      color: "#e5e7eb",
      boxShadow: boxShadow,
      border: '1px solid rgba(255,255,255,0.1)'
    };
  };

  // --- 7. TOOLTIP HANDLERS ---
  const handleMouseEnter = (e: React.MouseEvent, event: CalendarEvent) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setHoveredEvent(event);
  };

  const handleMouseLeave = () => {
    tooltipTimeout.current = setTimeout(() => {
      setHoveredEvent(null);
    }, 150); 
  };

  const keepTooltipOpen = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
  };

  if (loading && events.length === 0) return <div className="flex justify-center items-center h-full text-blue-400"><Loader2 className="animate-spin" size={48} /></div>;
  if (error) return <div className="flex justify-center items-center h-full text-red-400 gap-2"><AlertCircle /> {error}</div>;

  return (
    // GLASS CONTAINER
    <GlassPane intensity="medium" className="flex flex-col h-full w-full rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-white/10 shadow-none sm:shadow-2xl">
      
      {/* 1. CALENDAR TOOLBAR (Removed Logout/User) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 shadow-sm z-20 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          
          <button onClick={nextWeek} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300"><ChevronRight size={22} /></button>
          <button onClick={goToToday} className="px-4 sm:px-5 py-1.5 text-sm font-medium bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-lg shadow-blue-900/20 border border-blue-500/30">امروز</button>
          <button onClick={prevWeek} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300"><ChevronLeft size={22} /></button>
          
          <button 
            onClick={() => { setSelectedEvent(null); setIsModalOpen(true); }}
            className="hidden sm:flex items-center gap-2 px-5 py-1.5 text-sm font-medium bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-lg shadow-emerald-900/20 border border-emerald-500/30 mr-3"
          >
            <Plus size={18} /> <span>رویداد جدید</span>
          </button>

          <LegendFilter 
            departments={departments}
            hiddenIds={hiddenDeptIds}
            onToggle={toggleDeptVisibility}
            onShowAll={showAllDepts}
          />
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-100 drop-shadow-md">
            {startOfWeek.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}
          </h2>
          <div className="hidden sm:block h-8 w-px bg-white/10"></div>
          <div className="hidden sm:block">
            <DigitalClock />
          </div>
        </div>
      </div>

      {/* 2. MAIN GRID */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR */}
        <div className="w-32 flex flex-col border-l border-white/10 bg-black/40 backdrop-blur-md z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative">
          <div className="h-12 border-b border-white/10 bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400 shadow-sm">تمام روز</div>
          
          {weekDays.map((dayDate, i) => {
            const dateStr = dayDate.toISOString().split('T')[0];
            const isFriday = dayDate.getDay() === 5; 
            const holidayObj = holidays.find(h => h.holiday_date === dateStr);
            const isHoliday = isFriday || !!holidayObj;
            
            const allDayEvents = events.filter(e => 
              e.is_all_day && 
              new Date(e.start_time).toDateString() === dayDate.toDateString() &&
              (!e.department_id || !hiddenDeptIds.includes(e.department_id))
            );

            return (
              <div 
                key={i} 
                className={clsx(
                  "flex-1 flex flex-row items-stretch border-b border-white/10 relative transition-all p-1 gap-1 group",
                  isToday(dayDate) ? "bg-white/5 text-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]" : "text-gray-400",
                  isHoliday && !isToday(dayDate) && "bg-red-900/20 text-red-400"
                )}
              >
                <div className="z-10 flex flex-col items-center justify-center w-8 shrink-0 group-hover:scale-105 transition-transform">
                  <span className="text-[10px] font-bold">{WEEK_DAYS[i]}</span>
                  <span className="text-xs opacity-70 mt-0.5">{dayDate.toLocaleDateString("fa-IR-u-nu-arab", { day: "numeric" })}</span>
                </div>

                {/* All-Day Event Chips */}
                <div className="flex-1 flex flex-row gap-1 items-center justify-start overflow-hidden">
                  {allDayEvents.map(ev => {
                    const style = getEventStyle(ev);
                    return (
                      <div 
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setIsModalOpen(true); }}
                        onMouseEnter={(e) => handleMouseEnter(e, ev)}
                        onMouseLeave={handleMouseLeave}
                        className={clsx(
                          "h-[90%] min-w-[20px] max-w-[28px] rounded-md cursor-pointer shadow-sm transition-all hover:scale-105 hover:shadow-md z-20 relative border-white/10 border backdrop-blur-sm flex items-center justify-center",
                          ev.status === 'rejected' && "opacity-60 line-through"
                        )}
                        style={{
                          backgroundColor: style.backgroundColor,
                          color: style.color,
                          boxShadow: style.boxShadow, 
                          backgroundImage: (style as any).backgroundImage
                        }}
                      >
                        <span className="text-[9px] font-bold whitespace-nowrap" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                          {ev.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {holidayObj && <span className="absolute bottom-0 left-1 text-[8px] text-red-400/60 px-1 truncate max-w-[50px]">{holidayObj.occasion}</span>}
                {isToday(dayDate) && <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 z-10 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>}
              </div>
            );
          })}
        </div>

        {/* TIMELINE */}
        <div className="flex-1 flex flex-col min-w-0 relative overflow-x-auto custom-scrollbar" ref={scrollRef}>
          
          {/* Header */}
          <div className="flex h-12 border-b border-white/10 bg-white/5 select-none min-w-[1200px] sticky top-0 z-10 backdrop-blur-md shadow-sm">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex-1 flex items-center justify-start text-[10px] font-medium text-gray-500 border-l border-white/10 px-2">
                {toPersianDigits(i)}:{toPersianDigits("00")}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col relative min-w-[1200px]">
            <div className="absolute inset-0 flex pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex-1 border-l border-white/5 h-full"></div>
              ))}
            </div>

            {weekDays.map((dayDate, dayIndex) => {
              const isCurrentDay = isToday(dayDate);
              const dateStr = dayDate.toISOString().split('T')[0];
              const isFriday = dayDate.getDay() === 5;
              const holidayObj = holidays.find(h => h.holiday_date === dateStr);
              const isHoliday = isFriday || !!holidayObj;

              const dayEvents = events.filter(e => {
                const eStart = new Date(e.start_time).getTime();
                const eEnd = new Date(e.end_time).getTime();
                const dStart = dayDate.getTime();
                const dEnd = dStart + 86400000;
                
                if (e.department_id && hiddenDeptIds.includes(e.department_id)) return false;
                return eStart < dEnd && eEnd > dStart && !e.is_all_day;
              });

              const displayEvents = dayEvents.map(e => {
                const eStart = new Date(e.start_time).getTime();
                const eEnd = new Date(e.end_time).getTime();
                const visualStart = Math.max(eStart, dayDate.getTime());
                const visualEnd = Math.min(eEnd, dayDate.getTime() + 86400000);
                return { ...e, start_time: new Date(visualStart).toISOString(), end_time: new Date(visualEnd).toISOString() };
              });

              const visualEvents = calculateEventLayout(displayEvents);

              return (
                <div 
                  key={dayIndex} 
                  className={clsx("flex-1 border-b border-white/5 relative group min-h-[60px]", isHoliday && "bg-red-900/10")}
                >
                  <div className="absolute inset-0 group-hover:bg-white/5 transition-colors pointer-events-none"></div>

                  {/* Red Indicator */}
                  {isCurrentDay && (
                    <div 
                      className="absolute top-0 bottom-0 w-px bg-red-500 z-0 shadow-[0_0_12px_rgba(239,68,68,0.9)]"
                      style={{ right: getIndicatorPosition() }} 
                    >
                      <div className="absolute -top-1 -right-1.5 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,1)] border border-black"></div>
                    </div>
                  )}

                  {visualEvents.map((event, idx) => {
                    const originalEvent = dayEvents.find(e => e.id === event.id);
                    if (!originalEvent) return null;
                    
                    const style = getEventStyle(originalEvent);
                    const laneHeightPercent = 100 / event.totalLanes;
                    const topPos = event.laneIndex * laneHeightPercent;

                    return (
                      <div
                        key={`${event.id}-${dayIndex}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(originalEvent); setIsModalOpen(true); }}
                        onMouseEnter={(e) => handleMouseEnter(e, originalEvent)}
                        onMouseLeave={handleMouseLeave}
                        className={clsx(
                          "absolute rounded-lg px-2 flex items-center shadow-lg cursor-pointer hover:brightness-125 transition-all overflow-hidden z-10 border-y border-r border-white/10 p-[1px] backdrop-blur-sm hover:scale-[1.01] hover:z-20",
                          event.status === 'rejected' && "opacity-60 grayscale"
                        )}
                        style={{ 
                          right: `${event.right}%`, 
                          width: `${event.width}%`,
                          top: `${topPos}%`, 
                          height: `calc(${laneHeightPercent}% - 3px)`, 
                          backgroundColor: style.backgroundColor,
                          color: style.color,
                          boxShadow: style.boxShadow, 
                          backgroundImage: (style as any).backgroundImage,
                          filter: (style as any).filter,
                          textDecoration: (style as any).textDecoration
                        }}
                      >
                        <div className="truncate text-xs font-bold w-full drop-shadow-md pl-1">
                          {event.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
        onSuccess={handleEventUpdate}
        initialDate={currentDate}
        eventToEdit={selectedEvent}
        currentUserId={userId}
      />
      
      {hoveredEvent && (
        <EventTooltip 
          event={hoveredEvent} 
          departments={departments}
          onClose={() => setHoveredEvent(null)}
          onMouseEnter={keepTooltipOpen}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </GlassPane>
  );
});

CalendarGrid.displayName = "CalendarGrid";

export default CalendarGrid;