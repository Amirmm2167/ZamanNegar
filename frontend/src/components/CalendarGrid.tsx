"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Plus, Maximize2 } from "lucide-react";
import clsx from "clsx";
import EventModal from "./EventModal";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";
import InfiniteSwiper from "./ui/InfiniteSwiper";
import ExpandableBottomSheet from "./ui/ExpandableBottomSheet";
import MobileEventSheet from "./views/mobile/MobileEventSheet";
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
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
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
      const d = new Date(); 
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
      setCurrentDate(getDateForIndex(newIndex));
  };

  const handleOpenModal = (date: Date, start: string, end: string, event: CalendarEvent | null = null) => {
      setModalInitialDate(date); setModalStart(start); setModalEnd(end); setSelectedEvent(event); setIsModalOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
      if(isMobile) {
          setSheetEvent(null);
          setSheetDraft({ date, startHour: hour, endHour: hour + 1 });
          setIsSheetExpanded(false); setIsSheetOpen(true);
      } else {
          handleOpenModal(date, `${hour}:00`, `${hour+1}:00`);
      }
  };

  const handleEventTap = (event: CalendarEvent) => {
      setSheetEvent(event); setSheetDraft(null); setIsSheetExpanded(false); setIsSheetOpen(true);
  };
  
  // --- Drag & Drop Handler ---
  const handleEventDrop = async (event: CalendarEvent, newStartDate: Date) => {
      const oldStart = new Date(event.start_time);
      const oldEnd = new Date(event.end_time);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      
      const newEndDate = new Date(newStartDate.getTime() + durationMs);

      // Optimistic Update
      const oldEvents = [...events];
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start_time: newStartDate.toISOString(), end_time: newEndDate.toISOString() } : e));

      try {
          // FIX: Changed api.put to api.patch
          // FIX: Changed recurrence to recurrence_rule
          await api.patch(`/events/${event.id}`, {
              title: event.title,
              start_time: newStartDate.toISOString(),
              end_time: newEndDate.toISOString(),
              description: event.description,
              department_id: event.department_id,
              is_all_day: event.is_all_day,
              recurrence_rule: event.recurrence_rule 
          });
      } catch (err) {
          console.error("Failed to move event", err);
          // Revert on Failure
          setEvents(oldEvents);
          // It's good practice to show a toast here, but alert works for now
      }
  };

  const nextDate = () => handleSwipeChange(currentIndex + 1);
  const prevDate = () => handleSwipeChange(currentIndex - 1);
  const goToToday = () => { setCurrentIndex(0); setCurrentDate(new Date()); };
  
  const handleEventClick = (event: CalendarEvent) => { setHoveredEvent(event); };
  const canEditSheet = (sheetEvent && (sheetEvent.proposer_id === userId || ["manager", "superadmin"].includes(userRole))) || (!sheetEvent);

  const handleMobileMonthDayClick = (date: Date) => {
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      setViewMode('1day');
      setCurrentIndex(diffDays);
      setCurrentDate(date);
  };

  const getHeaderDateLabel = () => {
      const formatterMonth = new Intl.DateTimeFormat("fa-IR", { month: "long" });
      const formatterYear = new Intl.DateTimeFormat("fa-IR", { year: "numeric" });
      
      let start = new Date(currentDate);
      let end = new Date(currentDate);

      if (viewMode === '3day') {
          start.setDate(currentDate.getDate() - 1);
          end.setDate(currentDate.getDate() + 1);
      } else if (viewMode === 'week' || viewMode === 'mobile-week') {
          const day = currentDate.getDay(); 
          const diffToSat = (day + 1) % 7; 
          start.setDate(currentDate.getDate() - diffToSat); 
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
              <button onClick={nextDate} className="p-2 text-gray-300"><ChevronRight size={18} /></button>
              <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-white">امروز</button>
              <button onClick={prevDate} className="p-2 text-gray-300"><ChevronLeft size={18} /></button>
            </div>
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
                                draftEvent={offset === 0 && isSheetOpen ? sheetDraft : null} 
                                onEventDrop={handleEventDrop} 
                                onEventHold={()=>{}}
                                onEventDragStart={()=>{}}
                            />
                        );
                    }}
                />
            )}
            
            {viewMode === 'agenda' && <AgendaView events={events} departments={departments} onEventClick={handleEventTap} />}
        </div>

        <ExpandableBottomSheet isOpen={isSheetOpen} onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }} mode={canEditSheet ? "edit" : "view"} isExpanded={isSheetExpanded} onExpandChange={setIsSheetExpanded}>
            <MobileEventSheet event={sheetEvent} draftSlot={sheetDraft} isExpanded={isSheetExpanded} canEdit={canEditSheet} onClose={() => { setIsSheetOpen(false); setSheetDraft(null); }} onRefresh={fetchData} />
        </ExpandableBottomSheet>

        <EventModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd} eventToEdit={selectedEvent} currentUserId={userId} />
        {hoveredEvent && <EventTooltip event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} onMouseEnter={()=>{}} onMouseLeave={() => setHoveredEvent(null)} />}
      </GlassPane>
    </>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;