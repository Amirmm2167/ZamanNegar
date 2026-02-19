"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { 
  addDays, addMonths, subDays, subMonths, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth 
} from "date-fns-jalali";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";

// Sub-Views
import WeekView from "@/components/views/desktop/WeekView";
import MonthView from "@/components/views/desktop/MonthView";
import YearView from "@/components/views/desktop/YearView";
import MobileMonthView from "@/components/views/mobile/MobileMonthView"; 
import MobileGrid from "@/components/views/mobile/MobileGrid"; // <--- INTEGRATED MOBILE GRID
import AgendaView from "@/components/views/shared/AgendaView";

// Shared Components
import EventPanel from "@/components/EventPanel";

export interface CalendarGridHandle {
  navigate: (direction: 'prev' | 'next' | 'today') => void;
  setView: (view: any) => void;
  openNewEventPanel: () => void;
  getCurrentDate: () => Date;
  refresh: () => void;
}

const CalendarGrid = forwardRef<CalendarGridHandle, {}>((props, ref) => {
  const { viewMode, isMobile, setViewMode } = useLayoutStore(); 
  const { activeCompanyId } = useAuthStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);

  // --- PANEL STATE ---
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelInitialDate, setPanelInitialDate] = useState<Date | undefined>(undefined);
  const [panelInitialTime, setPanelInitialTime] = useState<{start: string, end: string} | undefined>(undefined);

  // --- 1. DATA FETCHING ---
  const getDateRange = useCallback(() => {
    const now = currentDate;
    let start, end;

    if (viewMode === 'month') {
      start = startOfWeek(startOfMonth(now));
      end = endOfWeek(endOfMonth(now));
    } else if (viewMode === 'agenda') {
      start = subMonths(now, 1);
      end = addMonths(now, 3);
    } else if (viewMode === 'day') {
      start = now;
      end = addDays(now, 1);
    } else if (viewMode === '3day') {
      start = now;
      end = addDays(now, 3);
    } else {
      // Week
      start = startOfWeek(now);
      end = endOfWeek(now);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [currentDate, viewMode]);

  const fetchEvents = useCallback(async () => {
    if (!activeCompanyId || viewMode === 'year') return; // Year view fetches its own density
    
    setLoading(prev => !prev ? true : prev); 
    
    try {
      const { start, end } = getDateRange();
      const response = await api.get<CalendarEvent[]>("/events/", {
        params: { start, end }
      });
      setEvents(response.data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, getDateRange, viewMode]);

  // --- 2. EFFECTS ---
  useEffect(() => {
    if (activeCompanyId) {
      api.get("/departments/").then(res => setDepartments(res.data)).catch(console.error);
      api.get("/holidays/").then(res => setHolidays(res.data)).catch(console.error);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const handleGlobalRefresh = () => fetchEvents();
    window.addEventListener('refresh-calendar', handleGlobalRefresh);
    return () => window.removeEventListener('refresh-calendar', handleGlobalRefresh);
  }, [fetchEvents]);

  // --- 3. CONTROLS ---
  useImperativeHandle(ref, () => ({
    navigate: () => {}, // Handled by useHeaderLogic now
    setView: () => {}, 
    openNewEventPanel: () => {
        setPanelInitialDate(currentDate);
        setPanelInitialTime(undefined);
        setSelectedEvent(null);
        setIsPanelOpen(true);
    },
    getCurrentDate: () => currentDate,
    refresh: fetchEvents
  }));

  // --- HANDLERS ---
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsPanelOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedEvent(null);
    setPanelInitialDate(date);
    const startStr = `${hour.toString().padStart(2, '0')}:00`;
    const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
    setPanelInitialTime({ start: startStr, end: endStr });
    setIsPanelOpen(true);
  };

  const handleYearDayDoubleClick = (date: Date) => {
      setCurrentDate(date);
      setViewMode('week'); 
  };

  // --- MOBILE GRID PARAMS MAPPER ---
  const getMobileGridDays = () => {
      if (viewMode === 'day') return 1;
      if (viewMode === '3day') return 3;
      return 7; // week
  };

  const getMobileGridStartDate = () => {
      if (viewMode === 'week') return startOfWeek(currentDate);
      return currentDate; // For day and 3day, start from current focused date
  };

  // --- RENDER ---
  return (
    <div className="h-full flex flex-col relative bg-[#020205]">
       
       <div className="flex-1 overflow-hidden relative">
          {loading && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 border border-blue-500/30">
                <Loader2 className="animate-spin" size={12} />
                <span>بروزرسانی...</span>
             </div>
          )}

          {/* MONTH VIEW */}
          {viewMode === 'month' && (
             <>
                <div className="hidden md:block h-full">
                    <MonthView 
                        currentDate={currentDate}
                        events={events}
                        departments={departments}
                        holidays={holidays}
                        onEventClick={handleEventClick}
                        onEventLongPress={() => {}} 
                        onSlotClick={handleSlotClick}
                    />
                </div>
                <div className="md:hidden h-full">
                    <MobileMonthView 
                        currentDate={currentDate}
                        events={events}
                        holidays={holidays}
                        departments={departments}
                        onEventClick={handleEventClick}
                        onSlotClick={handleSlotClick}
                    />
                </div>
             </>
          )}

          {/* DESKTOP WEEK VIEW */}
          {!isMobile && viewMode === 'week' && (
             <WeekView 
                currentDate={currentDate}
                events={events}
                departments={departments}
                holidays={holidays}
                hiddenDeptIds={[]} 
                onEventClick={handleEventClick}
                onEventLongPress={() => {}}
                onSlotClick={handleSlotClick}
                onEventHover={() => {}}
                onEventLeave={() => {}}
                draftEvent={null} 
             />
          )}

          {/* MOBILE GRIDS (Day, 3-Day, Week) */}
          {isMobile && ['day', '3day', 'week'].includes(viewMode) && (
              <MobileGrid
                  daysToShow={getMobileGridDays()}
                  startDate={getMobileGridStartDate()}
                  events={events}
                  holidays={holidays}
                  departments={departments}
                  hiddenDeptIds={[]} 
                  onEventTap={handleEventClick}
                  onEventHold={handleEventClick} // Opens edit panel immediately
                  onSlotClick={handleSlotClick}
                  draftEvent={null}
              />
          )}

          {/* AGENDA VIEW */}
          {viewMode === 'agenda' && (
             <AgendaView
                events={events}
                departments={departments}
                holidays={holidays}
                onEventClick={handleEventClick}
                onEventLongPress={handleEventClick} 
             />
          )}

          {/* YEAR VIEW (Desktop Usually) */}
          {viewMode === 'year' && (
             <YearView 
                currentDate={currentDate}
                onDayClick={(date) => handleSlotClick(date, 9)} 
                onDayDoubleClick={handleYearDayDoubleClick}
             />
          )}
          
       </div>

       <EventPanel 
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          onSuccess={() => {
             fetchEvents(); 
             setIsPanelOpen(false);
          }}
          eventToEdit={selectedEvent}
          initialDate={panelInitialDate}
          initialStartTime={panelInitialTime?.start}
          initialEndTime={panelInitialTime?.end}
       />
    </div>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;