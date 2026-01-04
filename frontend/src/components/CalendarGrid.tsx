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
import ExpandableBottomSheet from "./ui/ExpandableBottomSheet";
import MobileEventSheet from "./mobile/MobileEventSheet";
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

  // Modals (Desktop)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Mobile Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [sheetEvent, setSheetEvent] = useState<CalendarEvent | null>(null); // Real Event
  const [sheetDraft, setSheetDraft] = useState<{ date: Date; startHour: number; endHour: number } | null>(null); // Draft Slot

  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");
  const [isLandscape, setIsLandscape] = useState(false);

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

  // --- Handlers ---
  const handleOpenModal = (date: Date, start: string, end: string, event: CalendarEvent | null = null) => {
      setModalInitialDate(date); setModalStart(start); setModalEnd(end); setSelectedEvent(event); setIsModalOpen(true);
  };

  // 1. Mobile: Tap Empty Slot
  const handleSlotClick = (date: Date, hour: number) => {
      if(isMobile) {
          setSheetEvent(null);
          setSheetDraft({ date, startHour: hour, endHour: hour + 1 });
          setIsSheetExpanded(false); // Start Summary
          setIsSheetOpen(true);
      } else {
          handleOpenModal(date, `${hour}:00`, `${hour+1}:00`);
      }
  };

  // 2. Mobile: Tap Event
  const handleEventTap = (event: CalendarEvent) => {
      setSheetEvent(event);
      setSheetDraft(null);
      setIsSheetExpanded(false);
      setIsSheetOpen(true);
  };

  // 3. Mobile: Hold Event (Context Menu behavior could be merged here or kept separate)
  // For simplicity based on recent prompt, we treat Hold similar to Tap but maybe expand directly?
  // Let's keep it simple: Hold opens sheet too.
  const handleEventHold = (event: CalendarEvent) => {
      handleEventTap(event);
  };

  // Desktop Click
  const handleEventClick = (event: CalendarEvent) => { setHoveredEvent(event); };
  
  // Navigation
  const nextDate = () => { const d = new Date(currentDate); d.setDate(d.getDate() + (viewMode==='week'||viewMode==='mobile-week'?7:viewMode==='3day'?3:1)); setCurrentDate(d); };
  const prevDate = () => { const d = new Date(currentDate); d.setDate(d.getDate() - (viewMode==='week'||viewMode==='mobile-week'?7:viewMode==='3day'?3:1)); setCurrentDate(d); };
  const goToToday = () => setCurrentDate(new Date());

  // Swipe Nav
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const handleTouchStartNav = (e: React.TouchEvent) => { if (!isMobile) return; touchStartX.current = e.targetTouches[0].clientX; };
  const handleTouchMoveNav = (e: React.TouchEvent) => { if (!isMobile) return; setSwipeOffset(e.targetTouches[0].clientX - touchStartX.current); };
  const handleTouchEndNav = () => { if (!isMobile) return; if (swipeOffset > 80) prevDate(); else if (swipeOffset < -80) nextDate(); setSwipeOffset(0); };

  // Permission Check
  const canEdit = (sheetEvent && (sheetEvent.proposer_id === userId || ["manager", "superadmin"].includes(userRole))) || (!sheetEvent); // New draft is editable

  return (
    <>
      {isMobile && <button onClick={() => setIsLandscape(!isLandscape)} className="fixed bottom-4 right-4 z-[5000] p-3 bg-blue-600 text-white rounded-full shadow-2xl border border-white/20 hover:scale-110 transition-transform"><Maximize2 size={20} /></button>}

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

        <div className="flex-1 overflow-hidden relative" onTouchStart={handleTouchStartNav} onTouchMove={handleTouchMoveNav} onTouchEnd={handleTouchEndNav}>
            <div className="h-full w-full transition-transform duration-75 ease-linear" style={{ transform: `translateX(${swipeOffset}px)` }}>
                {viewMode === 'week' && <DesktopWeekView currentDate={currentDate} events={events} holidays={holidays} departments={departments} hiddenDeptIds={hiddenDeptIds} onEventClick={handleEventClick} onEventLongPress={() => {}} onSlotClick={handleSlotClick} onEventHover={(e, ev) => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); setHoveredEvent(ev); }} onEventLeave={() => tooltipTimeout.current = setTimeout(() => setHoveredEvent(null), 150)} draftEvent={null} />}
                {viewMode === 'month' && <DesktopMonthView currentDate={currentDate} events={events} holidays={holidays} departments={departments} onEventClick={handleEventClick} onEventLongPress={() => {}} onSlotClick={handleSlotClick} />}
                {(viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week') && <MobileGrid daysToShow={viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7} currentDate={currentDate} events={events} holidays={holidays} departments={departments} hiddenDeptIds={hiddenDeptIds} onEventTap={handleEventTap} onEventHold={handleEventHold} onEventDragStart={()=>{}} onSlotClick={handleSlotClick} draftEvent={isSheetOpen && sheetDraft ? sheetDraft : null} />}
                {viewMode === 'agenda' && <AgendaView events={events} departments={departments} onEventClick={handleEventTap} />}
            </div>
        </div>

        {/* Mobile Expandable Sheet */}
        <ExpandableBottomSheet 
            isOpen={isSheetOpen} 
            onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }}
            mode={canEdit ? "edit" : "view"}
            isExpanded={isSheetExpanded}
            onExpandChange={setIsSheetExpanded}
        >
            <MobileEventSheet 
                event={sheetEvent} 
                draftSlot={sheetDraft} 
                isExpanded={isSheetExpanded}
                canEdit={canEdit}
                onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }}
                onRefresh={fetchData}
            />
        </ExpandableBottomSheet>

        <EventModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd} eventToEdit={selectedEvent} currentUserId={userId} />
        {hoveredEvent && <EventTooltip event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} onMouseEnter={() => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }} onMouseLeave={() => tooltipTimeout.current = setTimeout(() => setHoveredEvent(null), 150)} />}
      </GlassPane>
    </>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;