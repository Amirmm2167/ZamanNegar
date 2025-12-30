"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CalendarEvent, Department } from "@/types";
import { ChevronRight, ChevronLeft, Loader2, AlertCircle, Plus, User, RefreshCw, Maximize2, Minimize2, Move } from "lucide-react";
import clsx from "clsx";
import EventModal from "./EventModal";
import DigitalClock from "./DigitalClock";
import EventTooltip from "./EventTooltip";
import LegendFilter from "./LegendFilter";
import GlassPane from "@/components/ui/GlassPane";
import BottomSheet from "./ui/BottomSheet";
import MoveConfirmationModal from "./modals/MoveConfirmationModal";
import { toPersianDigits } from "@/lib/utils"; // Ensure you have this

// Views
import MobileContextMenu from "./views/mobile/MobileContextMenu"; 
import DesktopWeekView from "./views/desktop/WeekView";
import DesktopMonthView from "./views/desktop/MonthView"; 
import MobileGrid from "./views/mobile/MobileGrid"; 
import AgendaView from "./views/shared/AgendaView";
import ViewSwitcher, { ViewMode } from "./views/shared/ViewSwitcher";

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
  const gridContainerRef = useRef<HTMLDivElement>(null); // Ref for time calculation

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hiddenDeptIds, setHiddenDeptIds] = useState<number[]>([]); 
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [draftEvent, setDraftEvent] = useState<{ date: Date; startHour: number; endHour: number } | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  const [modalInitialDate, setModalInitialDate] = useState(new Date());
  const [modalStart, setModalStart] = useState("09:00");
  const [modalEnd, setModalEnd] = useState("10:00");

  const [isLandscape, setIsLandscape] = useState(false);
  
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuEvent, setContextMenuEvent] = useState<CalendarEvent | null>(null);

  // --- DRAG & DROP STATE REFINED ---
  const [isDragging, setIsDragging] = useState(false); // Mode Active
  const [isHolding, setIsHolding] = useState(false);   // User is actively pressing down
  const [dragEvent, setDragEvent] = useState<CalendarEvent | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);
  const [currentDragTime, setCurrentDragTime] = useState<string>(""); // "14:30"
  
  const [isMoveConfirmOpen, setIsMoveConfirmOpen] = useState(false);
  const [dropTime, setDropTime] = useState<Date | null>(null);
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);

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

  // --- GLOBAL DRAG LISTENERS ---
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleGlobalMove, { passive: false });
      window.addEventListener('touchend', handleGlobalUp);
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);
      window.addEventListener('mousedown', handleGlobalDown);
      window.addEventListener('touchstart', handleGlobalDown, { passive: false });
    } else {
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('mousedown', handleGlobalDown);
      window.removeEventListener('touchstart', handleGlobalDown);
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    }
    return () => {
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('mousedown', handleGlobalDown);
      window.removeEventListener('touchstart', handleGlobalDown);
    };
  }, [isDragging]);

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

  // --- DRAG ENGINE ---
  const startDrag = (event: CalendarEvent) => {
    setDragEvent(event);
    setIsDragging(true);
    setIsHolding(false); // Waiting for user to grab
    setIsContextMenuOpen(false);
    // Start at center screen roughly
    setDragPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  };

  const handleGlobalDown = (e: TouchEvent | MouseEvent) => {
      setIsHolding(true);
      handleGlobalMove(e); // Update position immediately
  };

  const handleGlobalMove = (e: TouchEvent | MouseEvent) => {
    e.preventDefault(); 
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPosition({ x: clientX, y: clientY });

    // Calculate Time Helper
    if (gridContainerRef.current) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        // Assuming the grid is 00:00 to 24:00 fill the container height
        // We calculate relative Y inside the container
        let relativeY = clientY - rect.top;
        // Clamp
        relativeY = Math.max(0, Math.min(relativeY, rect.height));
        
        const percentage = relativeY / rect.height;
        const totalMinutes = percentage * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        
        // Round to nearest 15
        const roundedMinutes = Math.round(minutes / 15) * 15;
        const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
        const finalHours = roundedMinutes === 60 ? hours + 1 : hours;

        setCurrentDragTime(`${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`);
    }

    const edgeThreshold = 50;
    if (clientY < edgeThreshold) startEdgeScroll('prev');
    else if (clientY > window.innerHeight - edgeThreshold) startEdgeScroll('next');
    else if (scrollInterval.current) clearInterval(scrollInterval.current);
  };

  const startEdgeScroll = (direction: 'next' | 'prev') => {
    if (scrollInterval.current) return; 
    scrollInterval.current = setInterval(() => {
      if (direction === 'next') nextDate();
      else prevDate();
    }, 800); 
  };

  const handleGlobalUp = (e: TouchEvent | MouseEvent) => {
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    if (!isHolding) return; // If we weren't holding, don't drop

    setIsDragging(false);
    setIsHolding(false);
    
    // Parse the calculated time
    const [h, m] = currentDragTime.split(':').map(Number);
    const proposedDate = new Date(currentDate);
    if (!isNaN(h)) {
        proposedDate.setHours(h, m, 0, 0);
    } else {
        proposedDate.setHours(new Date().getHours(), 0, 0, 0);
    }
    
    setDropTime(proposedDate);
    setIsMoveConfirmOpen(true);
  };

  const finalizeMove = async (newStart: Date, newEnd: Date) => {
    if (!dragEvent) return;
    try {
      setLoading(true);
      await api.patch(`/events/${dragEvent.id}`, {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString()
      });
      fetchData();
      setIsMoveConfirmOpen(false);
      setDragEvent(null);
    } catch (e) {
      setError("خطا در جابجایی رویداد.");
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleMenuEdit = () => {
      if (contextMenuEvent) {
          setIsContextMenuOpen(false);
          handleOpenModal(new Date(contextMenuEvent.start_time), "", "", contextMenuEvent);
      }
  };
  const handleMenuDelete = async () => {
      if (!contextMenuEvent) return;
      if (confirm("آیا از حذف این رویداد اطمینان دارید؟")) {
          await api.delete(`/events/${contextMenuEvent.id}`);
          setIsContextMenuOpen(false);
          fetchData();
      }
  };
  const handleMenuMove = () => {
      if (contextMenuEvent) startDrag(contextMenuEvent);
  };

  // --- Swipe Logic ---
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStartNav = (e: React.TouchEvent) => {
      if (!isMobile || isDragging) return; 
      touchStartX.current = e.targetTouches[0].clientX;
      setIsSwiping(true);
  };
  const handleTouchMoveNav = (e: React.TouchEvent) => {
      if (!isMobile || isDragging || !isSwiping) return;
      setSwipeOffset(e.targetTouches[0].clientX - touchStartX.current);
  };
  const handleTouchEndNav = () => {
      if (!isMobile || isDragging) return;
      if (swipeOffset > 80) prevDate();
      else if (swipeOffset < -80) nextDate();
      setSwipeOffset(0);
      setIsSwiping(false);
  };

  // --- Navigation ---
  const nextDate = () => { 
      const d = new Date(currentDate); 
      if (viewMode === 'week' || viewMode === 'mobile-week') d.setDate(d.getDate() + 7);
      else if (viewMode === '3day') d.setDate(d.getDate() + 3);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 1);
      setCurrentDate(d); 
  };
  const prevDate = () => { 
      const d = new Date(currentDate); 
      if (viewMode === 'week' || viewMode === 'mobile-week') d.setDate(d.getDate() - 7);
      else if (viewMode === '3day') d.setDate(d.getDate() - 3);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 1);
      setCurrentDate(d); 
  };
  const goToToday = () => setCurrentDate(new Date());
  
  const handleHardRefresh = () => {
      if (window.confirm("آیا می‌خواهید برنامه را مجددا بارگذاری کنید؟")) {
          if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
          window.location.reload();
      }
  };

  const handleOpenModal = (date: Date, start: string, end: string, event: CalendarEvent | null = null) => {
      setModalInitialDate(date); setModalStart(start); setModalEnd(end); setSelectedEvent(event); setIsModalOpen(true); setDraftEvent(null);
  };
  const handleSlotClick = (date: Date, hour: number) => {
      if (draftEvent && draftEvent.date.toDateString() === date.toDateString() && draftEvent.startHour === hour) {
          handleOpenModal(date, `${hour}:00`, `${hour+1}:00`);
      } else {
          setDraftEvent({ date, startHour: hour, endHour: hour + 1 });
      }
  };
  const handleEventClick = (event: CalendarEvent) => { setHoveredEvent(event); setDraftEvent(null); };
  
  const handleEventLongPress = (event: CalendarEvent) => {
      if (isMobile) { setContextMenuEvent(event); setIsContextMenuOpen(true); }
      else if (["manager", "superadmin", "evaluator"].includes(userRole) || event.proposer_id === userId) {
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
    <>
      {isMobile && <button onClick={() => setIsLandscape(!isLandscape)} className="fixed bottom-4 right-4 z-[5000] p-3 bg-blue-600 text-white rounded-full shadow-2xl border border-white/20 hover:scale-110 transition-transform"><Maximize2 size={20} /></button>}

      <GlassPane intensity="medium" className={clsx("flex flex-col h-full w-full rounded-none sm:rounded-2xl overflow-hidden border-none sm:border border-white/10 shadow-none sm:shadow-2xl transition-all duration-300", isLandscape && "fixed inset-0 z-[5000] w-[100vh] h-[100vw] origin-top-right rotate-90 translate-x-[100%]")}>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-4 py-3 border-b border-white/10 shadow-sm z-30 bg-black/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <ViewSwitcher currentView={viewMode} onChange={setViewMode} isMobile={isMobile} />
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/10">
              <button onClick={nextDate} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><ChevronRight size={18} /></button>
              <button onClick={goToToday} className="px-3 py-1 text-xs font-bold hover:bg-white/10 text-white rounded-lg">امروز</button>
              <button onClick={prevDate} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><ChevronLeft size={18} /></button>
            </div>
            {isMobile && <div className="flex gap-2"><button onClick={handleHardRefresh} className="p-2 bg-white/5 text-gray-300 rounded-lg border border-white/10"><RefreshCw size={16} /></button><button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="p-2 bg-emerald-600 text-white rounded-lg"><Plus size={18} /></button></div>}
          </div>
          <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-sm font-bold text-gray-100 whitespace-nowrap">{currentDate.toLocaleDateString("fa-IR", { month: "long", year: "numeric" })}</span>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10"><User size={14} className="text-blue-400" /><span className="text-xs text-gray-200">{username}</span></div>
            <LegendFilter departments={departments} hiddenIds={hiddenDeptIds} onToggle={(id) => setHiddenDeptIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])} onShowAll={() => setHiddenDeptIds([])} />
            <button onClick={() => handleOpenModal(new Date(), "09:00", "10:00")} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg shadow-lg border border-emerald-500/30"><Plus size={16} /> <span>جدید</span></button>
          </div>
        </div>

        {/* View Container - Attached Ref here for calculation */}
        <div 
            ref={gridContainerRef}
            className="flex-1 overflow-hidden relative" 
            onTouchStart={handleTouchStartNav} 
            onTouchMove={handleTouchMoveNav} 
            onTouchEnd={handleTouchEndNav}
        >
            <div className="h-full w-full transition-transform duration-75 ease-linear" style={{ transform: `translateX(${swipeOffset}px)` }}>
                
                {/* Desktop Views */}
                {viewMode === 'week' && <DesktopWeekView currentDate={currentDate} events={events} holidays={holidays} departments={departments} hiddenDeptIds={hiddenDeptIds} onEventClick={handleEventClick} onEventLongPress={handleEventLongPress} onSlotClick={handleSlotClick} onEventHover={handleEventHover} onEventLeave={handleEventLeave} draftEvent={draftEvent} />}
                {viewMode === 'month' && <DesktopMonthView currentDate={currentDate} events={events} holidays={holidays} departments={departments} onEventClick={handleEventClick} onEventLongPress={handleEventLongPress} onSlotClick={handleSlotClick} />}
                
                {/* Mobile Views - Pass hiddenEventId so grid hides the original */}
                {(viewMode === '1day' || viewMode === '3day' || viewMode === 'mobile-week') && 
                    <MobileGrid 
                        daysToShow={viewMode === '1day' ? 1 : viewMode === '3day' ? 3 : 7} 
                        currentDate={currentDate} 
                        // Filter out the dragged event from the main grid view
                        events={isDragging && dragEvent ? events.filter(e => e.id !== dragEvent.id) : events} 
                        holidays={holidays} 
                        departments={departments} 
                        hiddenDeptIds={hiddenDeptIds} 
                        onEventClick={handleEventClick} 
                        onEventLongPress={handleEventLongPress} 
                        onSlotClick={handleSlotClick} 
                        draftEvent={draftEvent} 
                    />
                }
                
                {viewMode === 'agenda' && <AgendaView events={events} departments={departments} onEventClick={handleEventClick} />}
            </div>
        </div>

        {/* --- OVERLAYS --- */}
        
        {/* State A: Floating / Ready (Before Hold) */}
        {isDragging && !isHolding && dragEvent && dragPosition && (
            <div 
                className="fixed z-[9999] p-3 rounded-lg shadow-2xl animate-pulse cursor-grab backdrop-blur-md border-2"
                style={{ 
                    top: dragPosition.y - 40, 
                    left: dragPosition.x - 60, 
                    width: '140px', 
                    backgroundColor: departments.find(d => d.id === dragEvent.department_id)?.color + 'CC' || '#666666CC',
                    color: 'white',
                    borderColor: 'white'
                }}
            >
                <div className="text-xs font-bold truncate mb-1">{dragEvent.title}</div>
                <div className="flex items-center gap-1 text-[10px] font-bold bg-black/40 px-2 py-1 rounded-full w-fit mx-auto">
                    <Move size={12} />
                    <span>بکشید و رها کنید</span>
                </div>
            </div>
        )}

        {/* State B: Holding (Time Helper) */}
        {isDragging && isHolding && dragEvent && dragPosition && (
            <>
                {/* The Event Itself (Moving) */}
                <div 
                    className="fixed z-[9999] p-2 rounded-lg shadow-2xl opacity-90 cursor-grabbing border border-white/30"
                    style={{ 
                        top: dragPosition.y - 20, 
                        left: dragPosition.x - 50, 
                        width: '100px', 
                        backgroundColor: departments.find(d => d.id === dragEvent.department_id)?.color || '#666',
                        color: 'white',
                        pointerEvents: 'none' // Important: Let clicks pass through to global handler
                    }}
                >
                    <div className="text-[10px] font-bold truncate">{dragEvent.title}</div>
                </div>

                {/* The Time Helper (Next to Finger) */}
                <div 
                    className="fixed z-[9999] px-3 py-1 bg-black/80 text-white text-lg font-bold rounded-full border border-blue-500 shadow-xl backdrop-blur-md"
                    style={{ 
                        top: dragPosition.y - 60, 
                        left: dragPosition.x - 30,
                        pointerEvents: 'none'
                    }}
                >
                    {toPersianDigits(currentDragTime)}
                </div>
            </>
        )}

        <EventModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }} onSuccess={fetchData} initialDate={modalInitialDate} initialStartTime={modalStart} initialEndTime={modalEnd} eventToEdit={selectedEvent} currentUserId={userId} />
        
        {hoveredEvent && <EventTooltip event={hoveredEvent} departments={departments} onClose={() => setHoveredEvent(null)} onMouseEnter={() => { if(tooltipTimeout.current) clearTimeout(tooltipTimeout.current); }} onMouseLeave={() => tooltipTimeout.current = setTimeout(() => setHoveredEvent(null), 150)} />}
        
        <BottomSheet isOpen={isContextMenuOpen} onClose={() => setIsContextMenuOpen(false)} title="عملیات رویداد">
            {contextMenuEvent && <MobileContextMenu event={contextMenuEvent} userRole={userRole} currentUserId={userId} departments={departments} onClose={() => setIsContextMenuOpen(false)} onEdit={handleMenuEdit} onDelete={handleMenuDelete} onMove={handleMenuMove} />}
        </BottomSheet>

        <MoveConfirmationModal isOpen={isMoveConfirmOpen} onClose={() => setIsMoveConfirmOpen(false)} onConfirm={finalizeMove} originalEvent={dragEvent} newStartTime={dropTime} />
      </GlassPane>
    </>
  );
});

CalendarGrid.displayName = "CalendarGrid";
export default CalendarGrid;