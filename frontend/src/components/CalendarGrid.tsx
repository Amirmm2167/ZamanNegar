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

// Desktop Sub-Views
import WeekView from "@/components/views/desktop/WeekView";
import MonthView from "@/components/views/desktop/MonthView";
import AgendaView from "@/components/views/shared/AgendaView"; // NEW IMPORT
import YearView from "@/components/views/desktop/YearView";

// Mobile Sub-Views
import MobileMonthView from "@/components/views/mobile/MobileMonthView";


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
  // --- STORES ---
  const { viewMode } = useLayoutStore(); 
  const { activeCompanyId } = useAuthStore();

  // --- LOCAL STATE ---
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
      // UPDATED: Range-Based Infinite Scroll Strategy
      // Load 1 month back and 3 months forward
      start = subMonths(now, 1);
      end = addMonths(now, 3);
    } else {
      // Week / Mobile-Week / 3Day / Day
      start = startOfWeek(now);
      end = endOfWeek(now);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [currentDate, viewMode]);

  const fetchEvents = useCallback(async () => {
    if (!activeCompanyId) return;
    
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
  }, [activeCompanyId, getDateRange]);

  const handleYearDayDoubleClick = (date: Date) => {
      // 1. Update the centralized date
      setCurrentDate(date);
      // 2. Switch View to 'week' (User Requirement)
      // We assume useLayoutStore has a setViewMode action or we pass a callback prop
      // Since viewMode is from store, we ideally need the setter from store.
      // Assuming useLayoutStore returns { viewMode, setViewMode }
      useLayoutStore.getState().setViewMode('week'); 
  };

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

  // Listen for global refresh (e.g. from AgendaView inline actions)
  useEffect(() => {
    const handleGlobalRefresh = () => fetchEvents();
    window.addEventListener('refresh-calendar', handleGlobalRefresh);
    return () => window.removeEventListener('refresh-calendar', handleGlobalRefresh);
  }, [fetchEvents]);

  // --- 3. CONTROLS ---
  useImperativeHandle(ref, () => ({
    navigate: (direction) => {
      if (direction === 'today') {
        setCurrentDate(new Date());
        return;
      }
      
      if (viewMode === 'month') {
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
      } else if (viewMode === 'week' || viewMode === 'mobile-week') {
        setCurrentDate(prev => direction === 'next' ? addDays(prev, 7) : subDays(prev, 7));
      } else if (viewMode === 'agenda') {
        // For Agenda, jumping "Next" usually means jumping a month to trigger new loads
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
      } else {
        const step = viewMode === '3day' ? 3 : 1;
        setCurrentDate(prev => direction === 'next' ? addDays(prev, step) : subDays(prev, step));
      }
    },
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

          {viewMode === 'month' && (
             <>
                {/* Desktop View */}
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
                {/* Mobile Split View */}
                <div className="md:hidden h-full">
                    <MobileMonthView 
                        currentDate={currentDate}
                        events={events}
                        departments={departments}
                        holidays={holidays}
                        onEventClick={handleEventClick}
                        onSlotClick={handleSlotClick}
                    />
                </div>
             </>
          )}

          {viewMode === 'week' && (
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

          {/* NEW: Agenda View */}
          {viewMode === 'agenda' && (
             <AgendaView
                events={events}
                departments={departments}
                holidays={holidays}
                onEventClick={handleEventClick}
                onEventLongPress={handleEventClick} // Reuse logic for now
             />
          )}
          {viewMode === 'year' && (
             <YearView 
                currentDate={currentDate}
                onDayClick={(date) => handleSlotClick(date, 9)} // Open Panel on click
                onDayDoubleClick={handleYearDayDoubleClick}     // Go to Week on double click
             />
          )}
          
          {viewMode !== 'month' && viewMode !== 'week' && viewMode !== 'agenda' && viewMode !== 'year' && (
             <div className="flex h-full items-center justify-center text-gray-500 flex-col gap-2">
                <Loader2 className="animate-spin opacity-50" size={32} />
                <p className="text-sm">نمای {viewMode} در حال آماده‌سازی است...</p>
             </div>
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