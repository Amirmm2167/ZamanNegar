"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Loader2, AlertCircle, Plus, User, LogOut, Smartphone, Monitor, List, Calendar as CalIcon } from "lucide-react";
import clsx from "clsx";
import EventModal from "./EventModal";
import DigitalClock from "./DigitalClock";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";

// Views
import DesktopView from "./views/DesktopView";
import MobileTimeGrid from "./views/MobileTimeGrid";
import AgendaView from "./views/AgendaView";

interface Holiday {
  id: number;
  occasion: string;
  holiday_date: string; 
}

export interface CalendarGridHandle {
  openNewEventModal: () => void;
}

type ViewMode = "desktop" | "3day" | "1day" | "agenda";

const CalendarGrid = forwardRef<CalendarGridHandle>((props, ref) => {
  const router = useRouter();

  // --- STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>("1day"); // Default safe for mobile
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<number>(0);
  const [userRole, setUserRole] = useState("");

  // --- INTERACTION STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- DRAFT / PLACEHOLDER STATE ---
  const [draftEvent, setDraftEvent] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);

  // Modal Data defaults
  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");

  useImperativeHandle(ref, () => ({
    openNewEventModal: () => {
      handleOpenModal(new Date(), "09:00", "10:00");
    }
  }));

  useEffect(() => {
    // Initial responsive check
    if (window.innerWidth >= 768) {
        setViewMode("desktop");
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

  // --- Navigation ---
  const nextDate = () => { 
      const d = new Date(currentDate); 
      if (viewMode === 'desktop') d.setDate(d.getDate() + 7);
      else if (viewMode === '3day') d.setDate(d.getDate() + 3);
      else d.setDate(d.getDate() + 1);
      setCurrentDate(d); 
  };
  const prevDate = () => { 
      const d = new Date(currentDate); 
      if (viewMode === 'desktop') d.setDate(d.getDate() - 7);
      else if (viewMode === '3day') d.setDate(d.getDate() - 3);
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
      setDraftEvent(null); // Clear draft when opening modal
  };

  // 1. Slot Click (Placeholder Logic)
  const handleSlotClick = (date: Date, hour: number) => {
      // If clicking the SAME slot that is already a draft, open modal
      if (draftEvent && 
          draftEvent.date.toDateString() === date.toDateString() && 
          draftEvent.startHour === hour) {
          
          handleOpenModal(
              date, 
              `${hour.toString().padStart(2, '0')}:00`, 
              `${(hour + 1).toString().padStart(2, '0')}:00`
          );
      } else {
          // Create Draft/Placeholder
          setDraftEvent({ date, startHour: hour, endHour: hour + 1 });
      }
  };

  // 2. Event Click (Tooltip)
  const handleEventClick = (event: CalendarEvent) => {
      setHoveredEvent(event);
      // Clear draft if clicking a real event
      setDraftEvent(null);
  };

  // 3. Event Long Press (Edit)
  const handleEventLongPress = (event: CalendarEvent) => {
      // Permission check handled in modal, but we can check here too
      const isOwner = event.proposer_id === userId;
      const isManager = ["manager", "superadmin", "evaluator"].includes(userRole);
      
      if (isOwner || isManager) {
          handleOpenModal(new Date(event.start_time), "", "", event);
      } else {
          // Shake or show toast "No permission" (Optional)
      }
  };

  // 4. Hover (Desktop Only)
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
      
      {/* 1. MAIN HEADER */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-white/10 shadow-sm z-30 bg-black/20 backdrop-blur-sm shrink-0">
        
        {/* Left Side: View Switcher + Nav */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          
          {/* View Switcher */}
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 shrink-0">
             {/* Desktop Button: Hidden on Mobile */}
             <button onClick={() => setViewMode("desktop")} className={clsx("p-1.5 rounded transition-all hidden md:block", viewMode==="desktop" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")} title="هفتگی"><Monitor size={16}/></button>
             {/* Mobile Buttons */}
             <button onClick={() => setViewMode("3day")} className={clsx("p-1.5 rounded transition-all", viewMode==="3day" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")} title="۳ روزه"><span className="text-[10px] font-bold">3D</span></button>
             <button onClick={() => setViewMode("1day")} className={clsx("p-1.5 rounded transition-all", viewMode==="1day" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")} title="روزانه"><span className="text-[10px] font-bold">1D</span></button>
             <button onClick={() => setViewMode("agenda")} className={clsx("p-1.5 rounded transition-all", viewMode==="agenda" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")} title="لیست"><List size={16}/></button>
          </div>

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

        {/* Right Side: Title + Filters */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-sm font-bold text-gray-100 whitespace-nowrap hidden sm:block">
            {currentDate.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}
          </span>
          
          <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={(id) => setHiddenDeptIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])} onShowAll={() => setHiddenDeptIds([])} />
          
          <button 
            onClick={() => handleOpenModal(new Date(), "09:00", "10:00")}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg shadow-lg border border-emerald-500/30"
          >
            <Plus size={16} /> <span>جدید</span>
          </button>
        </div>
      </div>

      {/* 2. VIEW CONTENT */}
      <div className="flex-1 overflow-hidden relative" onMouseLeave={handleEventLeave}>
        {viewMode === 'desktop' && (
            <DesktopView 
                currentDate={currentDate} events={events} holidays={holidays} departments={departments} 
                hiddenDeptIds={hiddenDeptIds} 
                onEventClick={handleEventClick} 
                onEventLongPress={handleEventLongPress}
                onSlotClick={handleSlotClick}
                onEventHover={handleEventHover} 
                onEventLeave={handleEventLeave}
                draftEvent={draftEvent}
            />
        )}
        {(viewMode === '1day' || viewMode === '3day') && (
            <MobileTimeGrid 
                daysToShow={viewMode === '1day' ? 1 : 3}
                currentDate={currentDate} events={events} holidays={holidays} departments={departments} 
                hiddenDeptIds={hiddenDeptIds} 
                onEventClick={handleEventClick} 
                onEventLongPress={handleEventLongPress}
                onSlotClick={handleSlotClick}
                draftEvent={draftEvent}
            />
        )}
        {viewMode === 'agenda' && (
            <AgendaView 
                events={events} departments={departments} 
                onEventClick={handleEventClick}
            />
        )}
      </div>

      <EventModal 
        isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
        onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd}
        eventToEdit={selectedEvent} currentUserId={userId}
      />
      
      {hoveredEvent && (
        <EventTooltip 
            event={hoveredEvent} 
            departments={departments} 
            onClose={() => setHoveredEvent(null)} 
            onMouseEnter={() => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }} 
            onMouseLeave={handleEventLeave} 
        />
      )}
    </GlassPane>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;