"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Loader2, AlertCircle, Plus, User, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import clsx from "clsx";
import EventModal from "./EventModal";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";

// Components
import InfiniteSwiper from "./ui/InfiniteSwiper"; // NEW
import ExpandableBottomSheet from "./ui/ExpandableBottomSheet";
import MobileEventSheet from "./views/mobile/MobileEventSheet";
import DesktopWeekView from "./views/desktop/WeekView";
import DesktopMonthView from "./views/desktop/MonthView"; 
import MobileGrid from "./views/mobile/MobileGrid"; 
import AgendaView from "./views/shared/AgendaView";
import ViewSwitcher, { ViewMode } from "./views/shared/ViewSwitcher";

interface Holiday { id: number; occasion: string; holiday_date: string; }
export interface CalendarGridHandle { openNewEventModal: () => void; }

const CalendarGrid = forwardRef<CalendarGridHandle>((props, ref) => {
  const router = useRouter();

  // --- STATE ---
  const [viewMode, setViewMode] = useState<ViewMode>("1day"); 
  const [isMobile, setIsMobile] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<number>(0);
  const [userRole, setUserRole] = useState("");

  // Infinite Scroll State
  const [currentIndex, setCurrentIndex] = useState(0); // 0 = Today (relative to initial load)

  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [sheetEvent, setSheetEvent] = useState<CalendarEvent | null>(null);
  const [sheetDraft, setSheetDraft] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);

  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");
  const [isLandscape, setIsLandscape] = useState(false);

  // Desktop Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useImperativeHandle(ref, () => ({
    openNewEventModal: () => handleOpenModal(new Date(), "09:00", "10:00")
  }));

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile && (viewMode === 'week' || viewMode === 'month')) setViewMode('1day');
        else if (!mobile && (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week')) setViewMode('week');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    setUsername(localStorage.getItem("username") || "کاربر");
    setUserRole(localStorage.getItem("role") || "viewer");
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    try {
      if(events.length === 0) setLoading(true);
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

  // --- INFINITE SWIPE HELPER ---
  const getDateForIndex = (index: number) => {
      const d = new Date(); // Start from True Today
      let diff = 0;
      if (viewMode === '1day') diff = index;
      else if (viewMode === '3day') diff = index * 3; // Jump 3 days per index (Or 1 day if you want 1-day step)
      // Per your "Infinite Swipe 3D" request: "Swipe Left/Right shifts by 1 Day"
      // If so, we just use 'index' for 3day too.
      // But standard 3-Day view usually jumps 3. 
      // Let's implement the "1 Day Step" you asked for:
      if (viewMode === '3day') diff = index; 
      
      if (viewMode === 'mobile-week') diff = index * 7;
      
      d.setDate(d.getDate() + diff);
      return d;
  };

  const handleSwipeChange = (newIndex: number) => {
      setCurrentIndex(newIndex);
      setCurrentDate(getDateForIndex(newIndex));
  };

  // --- Handlers ---
  const handleOpenModal = (date: Date, start: string, end: string, event: CalendarEvent | null = null) => {
      setModalInitialDate(date); setModalStart(start); setModalEnd(end); setSelectedEvent(event); setIsModalOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
      if(isMobile) {
          setSheetEvent(null);
          setSheetDraft({ date, startHour: hour, endHour: hour + 1 });
          setIsSheetExpanded(false); 
          setIsSheetOpen(true);
      } else {
          handleOpenModal(date, `${hour}:00`, `${hour+1}:00`);
      }
  };

  const handleEventTap = (event: CalendarEvent) => {
      setSheetEvent(event);
      setSheetDraft(null);
      setIsSheetExpanded(false);
      setIsSheetOpen(true);
  };

  // On Mobile, Hold also opens sheet (Context logic handled inside sheet or separate menu)
  const handleEventHold = (event: CalendarEvent) => {
      handleEventTap(event);
  };

  // Desktop
  const handleEventClick = (event: CalendarEvent) => { setHoveredEvent(event); };
  
  // Explicit Navigation (Buttons) - Update Index
  const nextDate = () => handleSwipeChange(currentIndex + 1);
  const prevDate = () => handleSwipeChange(currentIndex - 1);
  const goToToday = () => { setCurrentIndex(0); setCurrentDate(new Date()); };

  const canEdit = (sheetEvent && (sheetEvent.proposer_id === userId || ["manager", "superadmin"].includes(userRole))) || (!sheetEvent);

  if (loading && events.length === 0) return <div className="flex justify-center items-center h-full text-blue-400"><Loader2 className="animate-spin" size={48} /></div>;
  if (error) return <div className="flex justify-center items-center h-full text-red-400 gap-2"><AlertCircle /> {error}</div>;

  return (
    <>
      {isMobile && <button onClick={() => setIsLandscape(!isLandscape)} className="fixed bottom-24 right-4 z-[5000] p-3 bg-blue-600 text-white rounded-full shadow-2xl border border-white/20 hover:scale-110 transition-transform"><Maximize2 size={20} /></button>}

      <GlassPane intensity="medium" className={clsx("flex flex-col h-full w-full rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-white/10 shadow-none sm:shadow-2xl transition-all duration-300", isLandscape && "fixed inset-0 z-[5000] w-[100vh] h-[100vw] origin-top-right rotate-90 translate-x-[100%]")}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-white/10 shadow-sm z-30 bg-black/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <ViewSwitcher currentView={viewMode} onChange={setViewMode} isMobile={isMobile} />
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/10">
              <button onClick={nextDate} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><ChevronRight size={18} /></button>
              <button onClick={goToToday} className="px-3 py-1 text-xs font-bold hover:bg-white/10 text-white rounded-lg">امروز</button>
              <button onClick={prevDate} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><ChevronLeft size={18} /></button>
            </div>
            {isMobile && <button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="p-2 bg-emerald-600 text-white rounded-lg"><Plus size={18} /></button>}
          </div>
          <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-sm font-bold text-gray-100 whitespace-nowrap">{currentDate.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}</span>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10"><User size={14} className="text-blue-400" /><span className="text-xs text-gray-200">{username}</span></div>
            <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={(id) => setHiddenDeptIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])} onShowAll={() => setHiddenDeptIds([])} />
            <button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg shadow-lg border border-emerald-500/30"><Plus size={16} /> <span>جدید</span></button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
            {/* Desktop Views */}
            {!isMobile && viewMode === 'week' && <DesktopWeekView currentDate={currentDate} events={events} holidays={holidays} departments={departments} hiddenDeptIds={hiddenDeptIds} onEventClick={handleEventClick} onEventLongPress={() => {}} onSlotClick={handleSlotClick} onEventHover={(e, ev) => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); setHoveredEvent(ev); }} onEventLeave={() => tooltipTimeout.current = setTimeout(() => setHoveredEvent(null), 150)} draftEvent={null} />}
            {!isMobile && viewMode === 'month' && <DesktopMonthView currentDate={currentDate} events={events} holidays={holidays} departments={departments} onEventClick={handleEventClick} onEventLongPress={() => {}} onSlotClick={handleSlotClick} />}
            
            {/* Mobile Infinite Ribbon */}
            {isMobile && (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week') && (
                <InfiniteSwiper 
                    currentIndex={currentIndex} 
                    onChange={handleSwipeChange}
                    renderItem={(offset) => {
                        const dateForPanel = getDateForIndex(currentIndex + offset);
                        return (
                            <MobileGrid 
                                daysToShow={viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7} 
                                startDate={dateForPanel} 
                                events={events} 
                                holidays={holidays} 
                                departments={departments} 
                                hiddenDeptIds={hiddenDeptIds} 
                                onEventTap={handleEventTap} 
                                onEventHold={handleEventHold} 
                                onEventDragStart={()=>{}} 
                                onSlotClick={handleSlotClick} 
                                draftEvent={isSheetOpen && sheetDraft ? sheetDraft : null} 
                            />
                        );
                    }}
                />
            )}
            
            {viewMode === 'agenda' && <AgendaView events={events} departments={departments} onEventClick={handleEventTap} />}
        </div>

        {/* Mobile Expandable Sheet (Non-Blocking if collapsed?) 
            For now, using the standard one which has backdrop. 
            To make it non-blocking 'Peek', we would need to remove the backdrop logic in CSS for collapsed state.
            We'll stick to the robust ExpandableBottomSheet we built.
        */}
        <ExpandableBottomSheet 
            isOpen={isSheetOpen} 
            onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }}
            mode={canEdit ? "edit" : "view"}
            isExpanded={isSheetExpanded}
            onExpandChange={setIsSheetExpanded}
        >
            <MobileEventSheet event={sheetEvent} draftSlot={sheetDraft} isExpanded={isSheetExpanded} canEdit={canEdit} onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }} onRefresh={fetchData} />
        </ExpandableBottomSheet>

        <EventModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd} eventToEdit={selectedEvent} currentUserId={userId} />
        {hoveredEvent && <EventTooltip event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} onMouseEnter={() => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }} onMouseLeave={() => tooltipTimeout.current = setTimeout(() => setHoveredEvent(null), 150)} />}
      </GlassPane>
    </>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;