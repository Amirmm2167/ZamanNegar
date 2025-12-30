"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Loader2, AlertCircle, Plus, User, LogOut } from "lucide-react";
import clsx from "clsx";
import EventModal from "./EventModal";
import DigitalClock from "./DigitalClock";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";

// Views
import WeekView from "./views/WeekView";
import MobileTimeGrid from "./views/MobileTimeGrid";
import AgendaView from "./views/AgendaView";
import MonthView from "./views/MonthView";
import ViewSwitcher, { ViewMode } from "./views/ViewSwitcher";

interface Holiday {
  id: number;
  occasion: string;
  holiday_date: string; 
}

export interface CalendarGridHandle {
  openNewEventModal: () => void;
}

const CalendarGrid = forwardRef<CalendarGridHandle>((props, ref) => {
  const router = useRouter();

  // --- STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>("1day"); 
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<number>(0);
  const [userRole, setUserRole] = useState("");

  // --- INTERACTION ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  const [draftEvent, setDraftEvent] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);

  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");

  useImperativeHandle(ref, () => ({
    openNewEventModal: () => {
      handleOpenModal(new Date(), "09:00", "10:00");
    }
  }));

  useEffect(() => {
    // Default to 'week' if wide, '1day' if narrow
    if (window.innerWidth >= 768) {
        setViewMode("week");
    }
    setUsername(localStorage.getItem("username") || "کاربر");
    setUserRole(localStorage.getItem("role") || "viewer");
    fetchData();
  }, []);

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

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // --- Navigation Logic ---
  const nextDate = () => { 
      const d = new Date(currentDate); 
      if (viewMode === 'week') d.setDate(d.getDate() + 7);
      else if (viewMode === '3day') d.setDate(d.getDate() + 3);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 1);
      setCurrentDate(d); 
  };
  const prevDate = () => { 
      const d = new Date(currentDate); 
      if (viewMode === 'week') d.setDate(d.getDate() - 7);
      else if (viewMode === '3day') d.setDate(d.getDate() - 3);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 1);
      setCurrentDate(d); 
  };
  const goToToday = () => setCurrentDate(new Date());

  // --- Interaction Handlers ---
  const handleOpenModal = (date: Date, start: string, end: string, event: CalendarEvent | null = null) => {
      setModalInitialDate(date);
      setModalStart(start);
      setModalEnd(end);
      setSelectedEvent(event);
      setIsModalOpen(true);
      setDraftEvent(null);
  };

  const handleSlotClick = (date: Date, hour: number) => {
      if (draftEvent && 
          draftEvent.date.toDateString() === date.toDateString() && 
          draftEvent.startHour === hour) {
          handleOpenModal(date, `${hour.toString().padStart(2, '0')}:00`, `${(hour + 1).toString().padStart(2, '0')}:00`);
      } else {
          setDraftEvent({ date, startHour: hour, endHour: hour + 1 });
      }
  };

  const handleEventClick = (event: CalendarEvent) => {
      setHoveredEvent(event);
      setDraftEvent(null);
  };

  const handleEventLongPress = (event: CalendarEvent) => {
      const isOwner = event.proposer_id === userId;
      const isManager = ["manager", "superadmin", "evaluator"].includes(userRole);
      if (isOwner || isManager) {
          handleOpenModal(new Date(event.start_time), "", "", event);
      }
  };

  const handleEventHover = (e: React.MouseEvent, event: CalendarEvent) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setHoveredEvent(event);
  };
  const handleEventLeave = () => {
    tooltipTimeout.current = setTimeout(() => { setHoveredEvent(null); }, 150); 
  };

  if (loading && events.length === 0) return <div className="flex justify-center items-center h-full text-blue-400"><Loader2 className="animate-spin" size={48} /></div>;
  if (error) return <div className="flex justify-center items-center h-full text-red-400 gap-2"><AlertCircle /> {error}</div>;

  return (
    <GlassPane intensity="medium" className="flex flex-col h-full w-full rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-white/10 shadow-none sm:shadow-2xl">
      
      {/* MAIN HEADER */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-white/10 shadow-sm z-30 bg-black/20 backdrop-blur-sm shrink-0">
        
        {/* Left: Nav Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <ViewSwitcher currentView={viewMode} onChange={setViewMode} />

          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
            <button onClick={nextDate} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300"><ChevronRight size={18} /></button>
            <button onClick={goToToday} className="px-3 py-1 text-xs font-bold hover:bg-white/10 text-white rounded-md">امروز</button>
            <button onClick={prevDate} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300"><ChevronLeft size={18} /></button>
          </div>

          <button 
            onClick={() => handleOpenModal(new Date(), "09:00", "10:00")}
            className="flex sm:hidden items-center justify-center p-2 bg-emerald-600/80 text-white rounded-lg shadow-lg border border-emerald-500/30"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Right: Info + Tools */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-sm font-bold text-gray-100 whitespace-nowrap hidden sm:block">
            {currentDate.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}
          </span>
          <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
             <User size={14} className="text-blue-400" />
             <span className="text-xs text-gray-200">{username}</span>
          </div>
          <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={(id) => setHiddenDeptIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])} onShowAll={() => setHiddenDeptIds([])} />
          <button 
            onClick={() => handleOpenModal(new Date(), "09:00", "10:00")}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg shadow-lg border border-emerald-500/30"
          >
            <Plus size={16} /> <span>جدید</span>
          </button>
        </div>
      </div>

      {/* VIEW CONTENT */}
      <div className="flex-1 overflow-hidden relative" onMouseLeave={handleEventLeave}>
        {viewMode === 'week' && (
            <WeekView 
                currentDate={currentDate} events={events} holidays={holidays} departments={departments} 
                hiddenDeptIds={hiddenDeptIds} 
                onEventClick={handleEventClick} onEventLongPress={handleEventLongPress}
                onSlotClick={handleSlotClick} onEventHover={handleEventHover} onEventLeave={handleEventLeave}
                draftEvent={draftEvent}
            />
        )}
        {(viewMode === '1day' || viewMode === '3day') && (
            <MobileTimeGrid 
                daysToShow={viewMode === '1day' ? 1 : 3}
                currentDate={currentDate} events={events} holidays={holidays} departments={departments} 
                hiddenDeptIds={hiddenDeptIds} 
                onEventClick={handleEventClick} onEventLongPress={handleEventLongPress}
                onSlotClick={handleSlotClick} draftEvent={draftEvent}
            />
        )}
        {viewMode === 'month' && (
            <MonthView 
                currentDate={currentDate} events={events} holidays={holidays} departments={departments}
                onEventClick={handleEventClick} onEventLongPress={handleEventLongPress}
                onSlotClick={handleSlotClick}
            />
        )}
        {viewMode === 'agenda' && (
            <AgendaView events={events} departments={departments} onEventClick={handleEventClick} />
        )}
      </div>

      <EventModal 
        isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
        onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd}
        eventToEdit={selectedEvent} currentUserId={userId}
      />
      
      {hoveredEvent && (
        <EventTooltip 
            event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} 
            onMouseEnter={() => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }} 
            onMouseLeave={handleEventLeave} 
        />
      )}
    </GlassPane>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;