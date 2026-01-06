"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Plus, Maximize2, Calendar as CalendarIcon } from "lucide-react";
import clsx from "clsx";
import EventModal from "./EventModal";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";
import InfiniteSwiper from "./ui/InfiniteSwiper";
import ExpandableBottomSheet from "./ui/ExpandableBottomSheet";
import MobileEventSheet from "./views/mobile/MobileEventSheet";
import QuickViewSheet from "./views/mobile/QuickViewSheet"; // NEW
import SkeletonGrid from "./views/mobile/SkeletonGrid"; // NEW
import DesktopWeekView from "./views/desktop/WeekView";
import DesktopMonthView from "./views/desktop/MonthView"; 
import MobileGrid from "./views/mobile/MobileGrid"; 
import MobileMonthGrid from "./views/mobile/MobileMonthGrid";
import AgendaView from "./views/shared/AgendaView";
import ViewSwitcher, { ViewMode } from "./views/shared/ViewSwitcher";
import { toPersianDigits } from "@/lib/jalali";

interface Holiday { id: number; occasion: string; holiday_date: string; }

export interface CalendarGridHandle { 
    openNewEventModal: () => void; 
    setView: (view: ViewMode) => void;
}

const CalendarGrid = forwardRef<CalendarGridHandle>((props, ref) => {
  const [viewMode, setViewMode] = useState<ViewMode>("1day"); 
  const [isMobile, setIsMobile] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [loading, setLoading] = useState(true); // Tracks initial load
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0); 
  
  // Sheet States
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  
  // Distinguish between QuickView (Read) and Edit Mode
  const [activeSheetMode, setActiveSheetMode] = useState<"quick" | "edit" | "create">("quick");
  
  const [sheetEvent, setSheetEvent] = useState<CalendarEvent | null>(null);
  const [sheetDraft, setSheetDraft] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState<number>(0);
  const [userRole, setUserRole] = useState("");
  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  
  // Date Picker Ref
  const dateInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openNewEventModal: () => handleOpenModal(new Date(), "09:00", "10:00"),
    setView: (view: ViewMode) => setViewMode(view)
  }));

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile) {
            if (viewMode === 'week') setViewMode('1day'); 
        } else {
            if (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week') setViewMode('week');
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    setUsername(localStorage.getItem("username") || "کاربر");
    setUserRole(localStorage.getItem("role") || "viewer");
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

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
        if(events.length === 0) setEvents([]); 
      } finally {
        setLoading(false);
      }
  };

  const getDateForIndex = (index: number) => {
      const d = new Date(currentDate); // Base off currentDate instead of always Today to allow Jumping
      // Reset logic: The InfiniteSwiper usually assumes index 0 is "currentDate".
      // So simple adding index works if we update currentDate only on explicit jumps.
      // Wait, InfiniteSwiper is 0-centered. 
      // If we jump to a date, we should probably reset index to 0.
      
      // Better logic: `currentDate` is the anchor. 
      if (viewMode === 'month') {
          d.setMonth(d.getMonth() + index);
      } else {
          let diff = 0;
          if (viewMode === '1day') diff = index; 
          else if (viewMode === '3day') diff = index * 3; 
          else if (viewMode === 'mobile-week') diff = index * 7; 
          d.setDate(d.getDate() + diff);
      }
      return d;
  };

  const handleSwipeChange = (newIndex: number) => {
      // We don't update currentIndex state here to avoid re-renders loop if not needed
      // But we track it for next/prev buttons if they depend on it
      // Actually, standard InfiniteSwiper logic:
      setCurrentIndex(newIndex);
  };

  const handleOpenModal = (date: Date, start: string, end: string, event: CalendarEvent | null = null) => {
      setModalInitialDate(date); setModalStart(start); setModalEnd(end); setSelectedEvent(event); setIsModalOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
      if(isMobile) {
          setSheetEvent(null);
          setSheetDraft({ date, startHour: hour, endHour: hour + 1 });
          setActiveSheetMode("create");
          setIsSheetExpanded(false); setIsSheetOpen(true);
      } else {
          handleOpenModal(date, `${hour}:00`, `${hour+1}:00`);
      }
  };

  const handleEventTap = (event: CalendarEvent) => {
      setSheetEvent(event); 
      setSheetDraft(null); 
      setActiveSheetMode("quick"); // Open Quick View first
      setIsSheetExpanded(false); 
      setIsSheetOpen(true);
  };

  // Switch from Quick View to Edit Mode
  const handleEditFromQuickView = () => {
      setActiveSheetMode("edit");
      setIsSheetExpanded(true); // Auto expand for editing
  };
  
  // Date Picker Handler
  const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.valueAsDate) {
          setCurrentDate(e.target.valueAsDate);
          setCurrentIndex(0); // Reset swiper to center on new date
      }
  };

  const nextDate = () => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
  const prevDate = () => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
  const goToToday = () => { setCurrentIndex(0); setCurrentDate(new Date()); };
  
  const handleEventClick = (event: CalendarEvent) => { setHoveredEvent(event); };
  const canEditSheet = (sheetEvent && (sheetEvent.proposer_id === userId || ["manager", "superadmin"].includes(userRole))) || (!sheetEvent);

  const handleMobileMonthDayClick = (date: Date) => {
      setViewMode('1day');
      setCurrentIndex(0);
      setCurrentDate(date);
  };

  const getHeaderDateLabel = () => {
      const formatterMonth = new Intl.DateTimeFormat("fa-IR", { month: "long" });
      const formatterYear = new Intl.DateTimeFormat("fa-IR", { year: "numeric" });
      
      // Calculate display date based on current index relative to anchor
      const displayDate = getDateForIndex(currentIndex);
      
      let start = new Date(displayDate);
      let end = new Date(displayDate);

      if (viewMode === '3day') {
          start.setDate(displayDate.getDate() - 1);
          end.setDate(displayDate.getDate() + 1);
      } else if (viewMode === 'week' || viewMode === 'mobile-week') {
          const day = displayDate.getDay(); 
          const diffToSat = (day + 1) % 7; 
          start.setDate(displayDate.getDate() - diffToSat); 
          end = new Date(start);
          end.setDate(start.getDate() + 6); 
      }

      const m1 = formatterMonth.format(start);
      const m2 = formatterMonth.format(end);
      const y1 = formatterYear.format(start);
      const y2 = formatterYear.format(end);

      let monthLabel = m1;
      if (m1 !== m2) {
          monthLabel = `${m1}-${m2}`;
      }

      let yearLabel = y1;
      if (y1 !== y2) yearLabel = `${y1}-${y2}`;

      return { monthLabel, yearLabel };
  };

  const { monthLabel, yearLabel } = getHeaderDateLabel();

  return (
    <>
      {isMobile && <button onClick={() => setIsLandscape(!isLandscape)} className="fixed bottom-24 right-4 z-[5000] p-3 bg-blue-600 text-white rounded-full shadow-2xl border border-white/20"><Maximize2 size={20} /></button>}

      <GlassPane intensity="medium" className={clsx("flex flex-col h-full w-full rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-white/10", isLandscape && "fixed inset-0 z-[5000] w-[100vh] h-[100vw] origin-top-right rotate-90 translate-x-[100%]")}>
        {/* HEADER */}
        <div className="flex flex-row gap-3 items-center justify-between px-4 py-3 border-b border-white/10 shadow-sm z-30 bg-black/20 backdrop-blur-sm shrink-0 h-14 sm:h-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {!isMobile && <ViewSwitcher currentView={viewMode} onChange={setViewMode} isMobile={isMobile} />}
            
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/10">
              <button onClick={nextDate} className="p-2 text-gray-300 hover:text-white"><ChevronRight size={18} /></button>
              <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-white">امروز</button>
              <button onClick={prevDate} className="p-2 text-gray-300 hover:text-white"><ChevronLeft size={18} /></button>
            </div>
            
            {/* Jump to Date (Mobile) */}
            {isMobile && (
                <div className="relative">
                    <button onClick={() => dateInputRef.current?.showPicker()} className="p-2 bg-white/5 text-gray-300 rounded-lg border border-white/5">
                        <CalendarIcon size={18} />
                    </button>
                    <input 
                        ref={dateInputRef} 
                        type="date" 
                        className="absolute inset-0 opacity-0 w-full h-full"
                        onChange={handleDateJump}
                    />
                </div>
            )}
            
            {isMobile && <button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="p-2 bg-emerald-600 text-white rounded-lg"><Plus size={18} /></button>}
          </div>
          
          <div className="flex items-center gap-2 sm:hidden absolute left-1/2 -translate-x-1/2 pointer-events-none">
             <span className="text-sm font-bold text-gray-100">{monthLabel}</span>
             <span className="text-xs text-gray-400 font-mono mt-0.5">{toPersianDigits ? toPersianDigits(yearLabel) : yearLabel}</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto justify-end">
             <div className="flex flex-col items-end mx-2">
                <span className="text-sm font-bold text-gray-100">{monthLabel}</span>
                <span className="text-[10px] text-gray-400">{toPersianDigits ? toPersianDigits(yearLabel) : yearLabel}</span>
             </div>
             <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={(id) => setHiddenDeptIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])} onShowAll={() => setHiddenDeptIds([])} />
             <button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 text-white rounded-lg"><Plus size={16} /> <span>جدید</span></button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-hidden relative w-full h-full">
            {/* Show Skeleton if Loading on Mobile */}
            {isMobile && loading && events.length === 0 ? (
                <SkeletonGrid daysToShow={viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7} />
            ) : (
                <>
                    {!isMobile && viewMode === 'week' && <DesktopWeekView currentDate={currentDate} events={events} holidays={holidays} departments={departments} hiddenDeptIds={hiddenDeptIds} onEventClick={handleEventClick} onEventLongPress={()=>{}} onSlotClick={handleSlotClick} onEventHover={(e, ev) => setHoveredEvent(ev)} onEventLeave={() => setHoveredEvent(null)} draftEvent={null} />}
                    {!isMobile && viewMode === 'month' && <DesktopMonthView currentDate={currentDate} events={events} holidays={holidays} departments={departments} onEventClick={handleEventClick} onEventLongPress={()=>{}} onSlotClick={handleSlotClick} />}
                    
                    {/* Mobile Infinite Ribbon */}
                    {isMobile && (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week' || viewMode === 'month') && (
                        <InfiniteSwiper 
                            currentIndex={currentIndex} 
                            onChange={handleSwipeChange}
                            renderItem={(offset) => {
                                const panelIndex = currentIndex + offset;
                                const panelDate = getDateForIndex(panelIndex);
                                
                                if (viewMode === 'month') {
                                    return (
                                        <MobileMonthGrid 
                                            key={panelIndex}
                                            startDate={panelDate}
                                            events={events}
                                            holidays={holidays}
                                            departments={departments}
                                            onDateClick={handleMobileMonthDayClick}
                                        />
                                    );
                                }

                                return (
                                    <MobileGrid 
                                        key={panelIndex}
                                        daysToShow={viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7} 
                                        startDate={panelDate} 
                                        events={events} holidays={holidays} departments={departments} hiddenDeptIds={hiddenDeptIds} 
                                        onEventTap={handleEventTap} 
                                        onSlotClick={handleSlotClick} 
                                        draftEvent={offset === 0 && isSheetOpen && activeSheetMode === 'create' ? sheetDraft : null} 
                                        onEventHold={() => {}}
                                    />
                                );
                            }}
                        />
                    )}
                    
                    {viewMode === 'agenda' && <AgendaView events={events} departments={departments} onEventClick={handleEventTap} />}
                </>
            )}
        </div>

        <ExpandableBottomSheet isOpen={isSheetOpen} onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }} mode={activeSheetMode === "quick" ? "view" : "edit"} isExpanded={isSheetExpanded} onExpandChange={setIsSheetExpanded}>
            {activeSheetMode === "quick" && sheetEvent ? (
                <QuickViewSheet 
                    event={sheetEvent} 
                    departments={departments} 
                    onEdit={handleEditFromQuickView} 
                    onClose={() => setIsSheetOpen(false)} 
                />
            ) : (
                <MobileEventSheet event={sheetEvent} draftSlot={sheetDraft} isExpanded={isSheetExpanded} canEdit={canEditSheet} onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }} onRefresh={fetchData} />
            )}
        </ExpandableBottomSheet>

        <EventModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd} eventToEdit={selectedEvent} currentUserId={userId} />
        {hoveredEvent && <EventTooltip event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} onMouseEnter={()=>{}} onMouseLeave={() => setHoveredEvent(null)} />}
      </GlassPane>
    </>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;