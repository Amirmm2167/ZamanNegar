"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { addDays, addMonths, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns-jalali";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { EventInstance, Department } from "@/types";
import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";

// Sub-Views
import WeekView from "@/components/views/desktop/WeekView";
import MonthView from "@/components/views/desktop/MonthView";
// import AgendaView from "@/components/views/shared/AgendaView"; // Uncomment when created

// Shared Components
import EventModal from "@/components/EventModal";

// Interface for Parent Control
export interface CalendarGridHandle {
  navigate: (direction: 'prev' | 'next' | 'today') => void;
  setView: (view: any) => void; // Legacy support
  openNewEventModal: () => void;
  getCurrentDate: () => Date;
}

const CalendarGrid = forwardRef<CalendarGridHandle, {}>((props, ref) => {
  // --- STORES ---
  // We now drive the view exclusively from the global store
  const { viewMode } = useLayoutStore(); 
  const { activeCompanyId, user } = useAuthStore();

  // --- LOCAL STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);

  // --- MODAL STATE ---
  const [selectedEvent, setSelectedEvent] = useState<EventInstance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(undefined);
  const [modalInitialTime, setModalInitialTime] = useState<{start: string, end: string} | undefined>(undefined);

  // --- EXPOSE CONTROLS TO PARENT (AppShell) ---
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
      } else {
        // Day / 3Day / Agenda
        const step = viewMode === '3day' ? 3 : 1;
        setCurrentDate(prev => direction === 'next' ? addDays(prev, step) : subDays(prev, step));
      }
    },
    setView: () => {}, // Deprecated, state is handled by store now
    openNewEventModal: () => {
        setModalInitialDate(currentDate);
        setIsModalOpen(true);
    },
    getCurrentDate: () => currentDate
  }));

  // --- 1. FETCH METADATA (Departments/Holidays) ---
  useEffect(() => {
    if (activeCompanyId) {
      api.get("/departments/").then(res => setDepartments(res.data)).catch(console.error);
      api.get("/holidays/").then(res => setHolidays(res.data)).catch(console.error);
    }
  }, [activeCompanyId]);

  // --- 2. CALCULATE DATE RANGE ---
  const getDateRange = () => {
    const now = currentDate;
    let start, end;

    if (viewMode === 'month') {
      start = startOfWeek(startOfMonth(now));
      end = endOfWeek(endOfMonth(now));
    } else if (viewMode === 'agenda') {
      // Agenda gets next 30 days by default
      start = now;
      end = addDays(now, 30);
    } else {
      // Week / Mobile-Week / 3Day / Day
      // Simplify for now: Just fetch the week surrounding the current date
      // Ideally, specific views define their exact needs
      start = startOfWeek(now);
      end = endOfWeek(now);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  // --- 3. FETCH EVENTS ---
  const fetchEvents = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const response = await api.get<EventInstance[]>("/events/", {
        params: { start, end }
      });
      setEvents(response.data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode, activeCompanyId]);

  // --- HANDLERS ---
  const handleEventClick = (event: EventInstance) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedEvent(null);
    setModalInitialDate(date);
    const startStr = `${hour.toString().padStart(2, '0')}:00`;
    const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
    setModalInitialTime({ start: startStr, end: endStr });
    setIsModalOpen(true);
  };

  // --- RENDER ---
  return (
    <div className="h-full flex flex-col relative bg-[#020205]">
       
       <div className="flex-1 overflow-hidden relative">
          {loading && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                <Loader2 className="animate-spin" size={12} />
                <span>بروزرسانی...</span>
             </div>
          )}

          {/* VIEW SWITCHER LOGIC */}
          {viewMode === 'month' && (
             <MonthView 
                currentDate={currentDate}
                events={events}
                departments={departments}
                holidays={holidays}
                onEventClick={handleEventClick}
                onEventLongPress={() => {}} 
                onSlotClick={handleSlotClick}
             />
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
          
          {/* Fallback for mobile views if on desktop, or other unimplemented views */}
          {viewMode !== 'month' && viewMode !== 'week' && (
             <div className="flex h-full items-center justify-center text-gray-500">
                <p>نمای {viewMode} در حال ساخت است...</p>
             </div>
          )}
       </div>

       <EventModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
             fetchEvents(); 
             setIsModalOpen(false);
          }}
          currentUserId={user?.id || 0}
          eventToEdit={selectedEvent}
          initialDate={modalInitialDate}
          initialStartTime={modalInitialTime?.start}
          initialEndTime={modalInitialTime?.end}
       />
    </div>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;