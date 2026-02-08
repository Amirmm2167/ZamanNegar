"use client";

import { useState, useEffect } from "react";
import { addDays, addMonths, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns-jalali";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { EventInstance, Department } from "@/types";
import { useLayoutStore } from "@/stores/layoutStore";
import { useAuthStore } from "@/stores/authStore";

// Sub-Views
import WeekView from "@/components/views/desktop/WeekView";
import MonthView from "@/components/views/desktop/MonthView";

// Shared Components
import EventModal from "@/components/EventModal";

export default function CalendarGrid() {
  // Stores
  const { viewMode, isSidebarOpen } = useLayoutStore();
  const { activeCompanyId, user } = useAuthStore();

  // Local State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]); // Placeholder for Holiday Type
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<EventInstance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(undefined);
  const [modalInitialTime, setModalInitialTime] = useState<{start: string, end: string} | undefined>(undefined);

  // 1. Fetch Departments (Once per Company Switch)
  useEffect(() => {
    if (activeCompanyId) {
      api.get("/departments/").then(res => setDepartments(res.data)).catch(console.error);
      api.get("/holidays/").then(res => setHolidays(res.data)).catch(console.error);
    }
  }, [activeCompanyId]);

  // 2. Calculate Date Range based on View
  const getDateRange = () => {
    const now = currentDate;
    if (viewMode === 'month') {
      // Fetch 42 days grid (approx)
      const start = startOfWeek(startOfMonth(now));
      const end = endOfWeek(endOfMonth(now));
      return { start: start.toISOString(), end: end.toISOString() };
    } else {
      // Week View
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  };

  // 3. Fetch Events Logic
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

  // Trigger Fetch on Dependencies
  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode, activeCompanyId]);

  // --- Handlers ---

  const handleEventClick = (event: EventInstance) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    // Open Modal for New Event at this time
    setSelectedEvent(null);
    setModalInitialDate(date);
    const startStr = `${hour.toString().padStart(2, '0')}:00`;
    const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
    setModalInitialTime({ start: startStr, end: endStr });
    setIsModalOpen(true);
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 7) : subDays(prev, 7));
    }
  };

  // (Optional) Expose navigation to a Header component via Context or Prop drilling
  // For now, we assume the Header is part of the layout or handled elsewhere.

  return (
    <div className="h-full flex flex-col relative bg-[#020205]">
       
       {/* View Renderer */}
       <div className="flex-1 overflow-hidden relative">
          {loading && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs flex items-center gap-2 backdrop-blur-md">
                <Loader2 className="animate-spin" size={12} />
                <span>در حال بروزرسانی...</span>
             </div>
          )}

          {viewMode === 'month' ? (
             <MonthView 
                currentDate={currentDate}
                events={events}
                departments={departments}
                holidays={holidays}
                onEventClick={handleEventClick}
                onEventLongPress={() => {}} // TODO
                onSlotClick={handleSlotClick}
             />
          ) : (
             <WeekView 
                currentDate={currentDate}
                events={events}
                departments={departments}
                holidays={holidays}
                hiddenDeptIds={[]} // Add filter state later
                onEventClick={handleEventClick}
                onEventLongPress={() => {}}
                onSlotClick={handleSlotClick}
                onEventHover={() => {}}
                onEventLeave={() => {}}
                draftEvent={null} // Add drag logic later
             />
          )}
       </div>

       {/* Event Modal */}
       <EventModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
             fetchEvents(); // Refresh Grid
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
}