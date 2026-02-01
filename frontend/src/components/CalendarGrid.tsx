"use client";

import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Plus, Calendar as CalendarIcon, Bell } from "lucide-react";
import clsx from "clsx";
import EventModal from "./EventModal";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";
import InfiniteSwiper from "./ui/InfiniteSwiper";
import ExpandableBottomSheet from "./ui/ExpandableBottomSheet";
import MobileEventSheet from "./views/mobile/MobileEventSheet";
import QuickViewSheet from "./views/mobile/QuickViewSheet"; 
import SkeletonGrid from "./views/mobile/SkeletonGrid"; 
import WeekView from "./views/desktop/WeekView";
import DesktopMonthView from "./views/desktop/MonthView"; 
import MobileGrid from "./views/mobile/MobileGrid"; 
import MobileMonthGrid from "./views/mobile/MobileMonthGrid";
import AgendaView from "./views/shared/AgendaView";
import ViewSwitcher, { ViewMode } from "./views/shared/ViewSwitcher";
import { toPersianDigits } from "@/lib/jalali";
import DatePicker from "./DatePicker"; 
import { useLayoutStore } from "@/stores/layoutStore";

interface Holiday { id: number; occasion: string; holiday_date: string; }

export interface CalendarGridHandle { 
    openNewEventModal: () => void; 
    setView: (view: ViewMode) => void;
}

const CalendarGrid = forwardRef<CalendarGridHandle>((props, ref) => {
  const queryClient = useQueryClient();
  
  // FIX: Read/Write from Global Store instead of local state
  const { viewMode, setViewMode, setSelectedEventId } = useLayoutStore();
  
  const [isMobile, setIsMobile] = useState(false);
  
  const { data: events = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['events'],
    queryFn: () => api.get("/events/").then(res => res.data),
  });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: () => api.get("/holidays/").then(res => res.data),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get("/departments/").then(res => res.data),
  });

  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.get("/auth/me").then(res => res.data).catch(() => ({ id: 0, role: 'viewer' })),
  });

  const userId = userData?.id || 0;
  const userRole = userData?.role || "viewer";
  const loading = eventsLoading;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0); 
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [activeSheetMode, setActiveSheetMode] = useState<"quick" | "edit" | "create">("quick");
  
  const [sheetEvent, setSheetEvent] = useState<CalendarEvent | null>(null);
  const [sheetDraft, setSheetDraft] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  
  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  useImperativeHandle(ref, () => ({
    openNewEventModal: () => handleOpenModal(new Date(), "09:00", "10:00"),
    setView: (view: ViewMode) => setViewMode(view)
  }));

  // Logic to switch view mode automatically on resize
  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        // Only switch if we are crossing the boundary
        if (mobile) {
            if (viewMode === 'week') setViewMode('1day'); 
        } else {
            if (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week') setViewMode('week');
        }
    };
    handleResize(); // Run once on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setViewMode]); // Removed viewMode from deps to prevent infinite loop

  const getDateForIndex = (index: number) => {
      const d = new Date(currentDate); 
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
      if (isMobile) {
        setSheetEvent(event); 
        setSheetDraft(null); 
        setActiveSheetMode("quick");
        setIsSheetExpanded(false); 
        setIsSheetOpen(true);
      } else {
        setSelectedEventId(event.id); 
      }
  };

  const handleEditFromQuickView = () => {
      setActiveSheetMode("edit");
      setIsSheetExpanded(true); 
  };
  
  const handleDateJump = (dateStr: string) => {
      if (dateStr) {
          setCurrentDate(new Date(dateStr));
          setCurrentIndex(0); 
          setIsDatePickerOpen(false); 
      }
  };

  const nextDate = () => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; });
  const prevDate = () => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; });
  const goToToday = () => { setCurrentIndex(0); setCurrentDate(new Date()); };
  
  const canEditSheet = (sheetEvent && (sheetEvent.proposer_id === userId || ["manager", "superadmin"].includes(userRole))) || (!sheetEvent);
  const handleMobileMonthDayClick = (date: Date) => { setViewMode('1day'); setCurrentIndex(0); setCurrentDate(date); };
  const handleRefresh = () => { queryClient.invalidateQueries(); };

  const getHeaderDateLabel = () => {
      const formatterMonth = new Intl.DateTimeFormat("fa-IR", { month: "long" });
      const formatterYear = new Intl.DateTimeFormat("fa-IR", { year: "numeric" });
      
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
      if (m1 !== m2) monthLabel = `${m1}-${m2}`;
      let yearLabel = y1;
      if (y1 !== y2) yearLabel = `${y1}-${y2}`;

      return { monthLabel, yearLabel };
  };

  const { monthLabel, yearLabel } = getHeaderDateLabel();

  return (
    <>
      <GlassPane intensity="medium" className={clsx("flex flex-col h-full w-full rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-white/10")}>
        
        {/* HEADER */}
        <div className={clsx(
            "flex items-center justify-between px-4 border-b border-white/10 bg-[#09090b]/90 backdrop-blur-md shrink-0 z-50",
            isMobile ? "h-16 shadow-lg" : "py-3 h-auto"
        )}>
          
          {/* MOBILE LEFT: Branding */}
          {isMobile && (
             <div className="flex items-center gap-3">
                 <div className="flex flex-col">
                    <span className="text-[20px] text-gray-100 font-black">
                       {monthLabel}
                    </span>
                    <span className="text-[12px] text-gray-400 font-medium">
                       {toPersianDigits(yearLabel)}
                    </span>
                 </div>
             </div>
          )}

          {/* CONTROLS */}
          <div className="flex items-center gap-2 w-auto justify-end">
            {!isMobile && <ViewSwitcher currentView={viewMode} onChange={setViewMode} isMobile={isMobile} />}
            
            {viewMode !== 'agenda' && (
                <div className={clsx("flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/10", isMobile && "order-last")}>
                  <button onClick={goToToday} className="px-3 py-2 text-xs font-bold text-white min-w-[40px]">

                      {viewMode === "week" &&("هفته جاری")}
                      {viewMode === "mobile-week" &&("هفته جاری")}

                      {viewMode === "month" &&("ماه جاری")}

                      {viewMode === "3day" &&("امروز")}

                      {viewMode === "1day" &&("امروز")}

                  </button>
                </div>
            )}
            
            {isMobile && (
                <button 
                    onClick={() => setIsDatePickerOpen(true)}
                    className="p-2 bg-white/5 text-gray-300 rounded-lg border border-white/5 active:scale-95 transition-transform hover:bg-white/10 ml-2"
                >
                    <CalendarIcon size={18} />
                </button>
            )}

            {isMobile && (
               <button className="p-2 text-gray-400 hover:text-white relative active:scale-95">
                   <Bell size={20} />
                   <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#09090b]" />
               </button>
            )}
          </div>
          
          {/* DESKTOP LEGEND */}
          <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto justify-end">
             <div className="flex flex-col items-end mx-2">
                <span className="text-sm font-bold text-gray-100">{monthLabel}</span>
                <span className="text-[10px] text-gray-400">{toPersianDigits ? toPersianDigits(yearLabel) : yearLabel}</span>
             </div>
             <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={(id) => setHiddenDeptIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])} onShowAll={() => setHiddenDeptIds([])} />
             <button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 text-white rounded-lg"><Plus size={16} /> <span>جدید</span></button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden relative w-full h-full">
            {isMobile && loading && events.length === 0 ? (
                <SkeletonGrid daysToShow={viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7} />
            ) : (
                <>
                    {!isMobile && viewMode === 'week' && <WeekView currentDate={currentDate} events={events} holidays={holidays} departments={departments} hiddenDeptIds={hiddenDeptIds} onEventClick={handleEventTap} onEventLongPress={()=>{}} onSlotClick={handleSlotClick} onEventHover={(e, ev) => setHoveredEvent(ev)} onEventLeave={() => setHoveredEvent(null)} draftEvent={null} />}
                    {!isMobile && viewMode === 'month' && <DesktopMonthView currentDate={currentDate} events={events} holidays={holidays} departments={departments} onEventClick={handleEventTap} onEventLongPress={()=>{}} onSlotClick={handleSlotClick} />}
                    
                    {isMobile && (viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week' || viewMode === 'month') && (
                        <InfiniteSwiper 
                            currentIndex={currentIndex} 
                            onChange={handleSwipeChange}
                            renderItem={(offset) => {
                                const panelIndex = currentIndex + offset;
                                const panelDate = getDateForIndex(panelIndex);
                                
                                if (viewMode === 'month') {
                                    return <MobileMonthGrid key={panelIndex} startDate={panelDate} events={events} holidays={holidays} departments={departments} onDateClick={handleMobileMonthDayClick} />;
                                }

                                return (
                                    <MobileGrid 
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

        <ExpandableBottomSheet 
            isOpen={isSheetOpen} 
            onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }} 
            mode={activeSheetMode === "quick" ? "view" : "edit"} 
            isExpanded={isSheetExpanded} 
            onExpandChange={setIsSheetExpanded}
        >
            {activeSheetMode === "quick" && sheetEvent ? (
                <QuickViewSheet 
                    event={sheetEvent} 
                    departments={departments} 
                    onEdit={handleEditFromQuickView} 
                    onClose={() => setIsSheetOpen(false)} 
                />
            ) : (
                <MobileEventSheet 
                  event={sheetEvent} 
                  draftSlot={sheetDraft} 
                  isExpanded={isSheetExpanded} 
                  canEdit={canEditSheet} 
                  onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }} 
                  onRefresh={handleRefresh}
                  isEditing={activeSheetMode === 'edit' || activeSheetMode === 'create'}
                />
            )}
        </ExpandableBottomSheet>
        
        {isDatePickerOpen && <DatePicker value={currentDate.toISOString().split('T')[0]} onChange={handleDateJump} onClose={() => setIsDatePickerOpen(false)} />}
        <EventModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} onSuccess={handleRefresh} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd} eventToEdit={selectedEvent} currentUserId={userId} />
        {hoveredEvent && <EventTooltip event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} onMouseEnter={()=>{}} onMouseLeave={() => setHoveredEvent(null)} />}
      </GlassPane>
    </>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;