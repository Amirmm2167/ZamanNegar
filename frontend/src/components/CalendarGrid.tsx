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
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<number>(0);

  // --- INTERACTION ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  
  // Modal Data defaults
  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");

  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    openNewEventModal: () => {
      setSelectedEvent(null);
      setIsModalOpen(true);
    }
  }));

  // --- RESPONSIVE INIT ---
  useEffect(() => {
    // Default to 'desktop' if wide, '1day' if narrow
    if (window.innerWidth < 768) {
        setViewMode("1day");
    }
    
    setUsername(localStorage.getItem("username") || "کاربر");
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

  // --- Filter Logic ---
  const toggleDeptVisibility = (id: number) => {
    // (Simplified recursive logic for brevity - keeping it functional)
    setHiddenDeptIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- Event Handlers for Views ---
  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedEvent(null);
    setModalInitialDate(date);
    setModalStart(`${hour.toString().padStart(2, '0')}:00`);
    setModalEnd(`${(hour + 1).toString().padStart(2, '0')}:00`);
    setIsModalOpen(true);
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
      
      {/* 1. MAIN HEADER (Sticky) */}
      <div className="flex flex-wrap gap-2 items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 shadow-sm z-30 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* View Switcher (Responsive) */}
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
             <button onClick={() => setViewMode("desktop")} className={clsx("p-1.5 rounded transition-all", viewMode==="desktop" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")} title="هفتگی"><Monitor size={16}/></button>
             <button onClick={() => setViewMode("3day")} className={clsx("p-1.5 rounded transition-all", viewMode==="3day" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")} title="۳ روزه"><CalIcon size={16}/></button>
             <button onClick={() => setViewMode("1day")} className={clsx("p-1.5 rounded transition-all", viewMode==="1day" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")} title="روزانه"><Smartphone size={16}/></button>
             <button onClick={() => setViewMode("agenda")} className={clsx("p-1.5 rounded transition-all", viewMode==="agenda" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")} title="لیست"><List size={16}/></button>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

          <button onClick={nextDate} className="p-1.5 hover:bg-white/10 rounded-full text-gray-300"><ChevronRight size={20} /></button>
          <button onClick={goToToday} className="px-3 py-1 text-xs font-bold bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg shadow-lg">امروز</button>
          <button onClick={prevDate} className="p-1.5 hover:bg-white/10 rounded-full text-gray-300"><ChevronLeft size={20} /></button>
          
          <button 
            onClick={() => { setSelectedEvent(null); setModalInitialDate(new Date()); setIsModalOpen(true); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg shadow-lg mr-2"
          >
            <Plus size={16} /> <span className="hidden sm:inline">جدید</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-100 drop-shadow-md whitespace-nowrap">
            {currentDate.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}
          </span>
          <div className="hidden md:block">
             <DigitalClock />
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
             <User size={14} className="text-blue-400" />
             <span className="text-xs text-gray-200">{username}</span>
          </div>
          <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={toggleDeptVisibility} onShowAll={() => setHiddenDeptIds([])} />
        </div>
      </div>

      {/* 2. VIEW CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'desktop' && (
            <DesktopView 
                currentDate={currentDate} events={events} holidays={holidays} departments={departments} 
                hiddenDeptIds={hiddenDeptIds} onEventClick={setSelectedEvent} onSlotClick={handleSlotClick}
                onEventHover={handleEventHover} onEventLeave={handleEventLeave}
            />
        )}
        {(viewMode === '1day' || viewMode === '3day') && (
            <MobileTimeGrid 
                daysToShow={viewMode === '1day' ? 1 : 3}
                currentDate={currentDate} events={events} holidays={holidays} departments={departments} 
                hiddenDeptIds={hiddenDeptIds} onEventClick={setSelectedEvent} onSlotClick={handleSlotClick}
            />
        )}
        {viewMode === 'agenda' && (
            <AgendaView 
                events={events} departments={departments} onEventClick={setSelectedEvent}
            />
        )}
      </div>

      <EventModal 
        isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
        onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd}
        eventToEdit={selectedEvent} currentUserId={userId}
      />
      
      {hoveredEvent && viewMode === 'desktop' && (
        <EventTooltip event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} onMouseEnter={() => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }} onMouseLeave={handleEventLeave} />
      )}
    </GlassPane>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;